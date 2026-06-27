import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPlans, createPlan, updatePlan } from '@/api/plans'
import { useAuth } from '@/context/AuthContext'
import type { CreatePlanRequest, UpdatePlanRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Plus, CreditCard, Edit3 } from 'lucide-react'

export default function Plans() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const isSuperadmin = user?.is_superadmin ?? false
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [form, setForm] = useState<CreatePlanRequest>({
    name: '',
    slug: '',
    description: '',
    price_cents: 0,
    max_users: 1,
    max_storage_mb: 100,
    is_active: true,
  })

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreatePlanRequest) => createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setDialogOpen(false)
      resetForm()
      toast({ title: 'Plan created', variant: 'success' })
    },
    onError: (err: unknown) => {
      let msg = 'Failed to create plan'
      if (err && typeof err === 'object' && 'response' in err) {
        const detail = (err as { response: { data: { detail?: unknown } } }).response?.data?.detail
        if (Array.isArray(detail)) {
          msg = detail.map((d: { msg?: string }) => d.msg).join(', ')
        } else if (typeof detail === 'string') {
          msg = detail
        }
      }
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanRequest }) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setEditDialogOpen(false)
      setEditingPlan(null)
      toast({ title: 'Plan updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Error', description: 'Update failed', variant: 'destructive' }),
  })

  function resetForm() {
    setForm({
      name: '',
      slug: '',
      description: '',
      price_cents: 0,
      max_users: 1,
      max_storage_mb: 100,
      is_active: true,
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  function handleEdit(plan: typeof plans[0]) {
    setEditingPlan(plan.id)
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_cents: plan.price_cents,
      max_users: plan.max_users,
      max_storage_mb: plan.max_storage_mb,
      is_active: plan.is_active,
    })
    setEditDialogOpen(true)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPlan) return
    updateMutation.mutate({ id: editingPlan, data: form })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground">
            Browse available subscription plans.
          </p>
        </div>
        {isSuperadmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Plan</DialogTitle>
                  <DialogDescription>Add a new subscription plan.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (cents)</Label>
                    <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Users</Label>
                      <Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Storage (MB)</Label>
                      <Input type="number" value={form.max_storage_mb} onChange={(e) => setForm({ ...form, max_storage_mb: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">Loading plans...</div>
        ) : plans.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No plans yet</h3>
              <p className="text-sm text-muted-foreground">No subscription plans are configured.</p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {!plan.is_active && <Badge variant="destructive">Inactive</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-3xl font-bold">
                  ${(plan.price_cents / 100).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <div className="space-y-2 text-sm">
                  <p>Max users: {plan.max_users}</p>
                  <p>Storage: {plan.max_storage_mb} MB</p>
                </div>
                {isSuperadmin && (
                  <Button variant="outline" className="w-full" onClick={() => handleEdit(plan)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Price (cents)</Label>
                <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active ?? true}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

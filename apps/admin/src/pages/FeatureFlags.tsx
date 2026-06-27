import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
} from '@/api/feature_flags'
import { useAuth } from '@/context/AuthContext'
import type { CreateFeatureFlagRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Flag } from 'lucide-react'

export default function FeatureFlags() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const isSuperadmin = user?.is_superadmin ?? false
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateFeatureFlagRequest>({
    key: '',
    name: '',
    description: '',
    is_enabled_default: false,
  })

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: listFeatureFlags,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateFeatureFlagRequest) => createFeatureFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      setDialogOpen(false)
      setForm({ key: '', name: '', description: '', is_enabled_default: false })
      toast({ title: 'Feature flag created', variant: 'success' })
    },
    onError: (err: unknown) => {
      let msg = 'Failed to create flag'
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
    mutationFn: ({ id, data }: { id: string; data: { is_enabled_default?: boolean | null } }) =>
      updateFeatureFlag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
      toast({ title: 'Feature flag updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Error', description: 'Update failed', variant: 'destructive' }),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  function handleToggleDefault(flag: typeof flags[0]) {
    updateMutation.mutate({
      id: flag.id,
      data: { is_enabled_default: !flag.is_enabled_default },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage global feature flags for the platform.
          </p>
        </div>
        {isSuperadmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Flag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Feature Flag</DialogTitle>
                  <DialogDescription>
                    Add a new global feature flag.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Key</Label>
                    <Input
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value.replace(/[^a-z0-9_.-]/g, '') })}
                      placeholder="new-feature"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="New Feature"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_enabled_default ?? false}
                      onCheckedChange={(v) => setForm({ ...form, is_enabled_default: v })}
                    />
                    <Label>Enabled by default</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading flags...</div>
      ) : flags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Flag className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No feature flags yet</h3>
            <p className="text-sm text-muted-foreground">
              Create feature flags to control platform behavior.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-mono text-sm">{flag.key}</TableCell>
                  <TableCell>{flag.name}</TableCell>
                  <TableCell className="text-muted-foreground">{flag.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={flag.is_enabled_default ? 'success' : 'secondary'}>
                      {flag.is_enabled_default ? 'ON' : 'OFF'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isSuperadmin && (
                      <Switch
                        checked={flag.is_enabled_default}
                        onCheckedChange={() => handleToggleDefault(flag)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTenants, createTenant, deleteTenant, deleteTenants } from '@/api/tenants'
import type { Tenant, CreateTenantRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Building2, Plus, Trash2, ArrowRight } from 'lucide-react'

export default function Tenants() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantRequest) => createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDialogOpen(false)
      setName('')
      setSlug('')
      setSubdomain('')
      toast({ title: 'Tenant created', variant: 'success' })
    },
    onError: (err: unknown) => {
      let msg = 'Failed to create tenant'
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setSelected(new Set())
      toast({ title: 'Tenant deleted', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete tenant', variant: 'destructive' })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteTenants(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setSelected(new Set())
      toast({ title: 'Tenants deleted', description: `${data.deleted} tenant(s) removed.`, variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete tenants', variant: 'destructive' })
    },
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate({ name, slug, subdomain: subdomain || null })
  }

  const allSelected = tenants.length > 0 && selected.size === tenants.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tenants.map((t: Tenant) => t.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelected(next)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'trial': return 'warning'
      case 'inactive':
      case 'suspended': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Manage all your tenants in one place.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Tenant</DialogTitle>
                <DialogDescription>
                  Add a new tenant to the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme-corp"
                    required
                    pattern="^[a-z0-9-]+$"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain (optional)</Label>
                  <Input
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="acme"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Delete ${selected.size} tenant(s)? This cannot be undone.`)) {
                bulkDeleteMutation.mutate(Array.from(selected))
              }
            }}
            disabled={bulkDeleteMutation.isPending}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete Selected`}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No tenants yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first tenant to get started.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Tenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant: Tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(tenant.id)}
                      onChange={() => toggleOne(tenant.id)}
                      aria-label={`Select ${tenant.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(tenant.status)}>{tenant.status}</Badge>
                  </TableCell>
                  <TableCell>{tenant.subdomain || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/tenants/${tenant.id}`}>
                          Manage <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(tenant.id)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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

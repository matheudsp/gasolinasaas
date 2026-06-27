import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTenant, updateTenant, deleteTenant, subscribeToPlan, cancelSubscription } from '@/api/tenants'
import { listPlans } from '@/api/plans'
import { getTenantFeatureFlags, setTenantFeatureFlag } from '@/api/feature_flags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Trash2, CreditCard, Users } from 'lucide-react'

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => getTenant(id!),
    enabled: !!id,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: listPlans,
  })

  const { data: tenantFlags = [] } = useQuery({
    queryKey: ['tenant-flags', id],
    queryFn: () => getTenantFeatureFlags(id!),
    enabled: !!id,
  })

  const [name, setName] = useState('')

  const updateMutation = useMutation({
    mutationFn: () => updateTenant(id!, { name: name || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
      toast({ title: 'Tenant updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Error', description: 'Update failed', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenant(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast({ title: 'Tenant deleted', variant: 'success' })
      navigate('/tenants')
    },
    onError: () => toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' }),
  })

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => subscribeToPlan(id!, planId),
    onSuccess: () => {
      toast({ title: 'Subscribed', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
    },
    onError: (err: unknown) => {
      let msg = 'Subscription failed'
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

  const cancelSubMutation = useMutation({
    mutationFn: () => cancelSubscription(id!),
    onSuccess: () => {
      toast({ title: 'Subscription canceled', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
    },
    onError: () => toast({ title: 'Error', description: 'Cancel failed', variant: 'destructive' }),
  })

  const flagMutation = useMutation({
    mutationFn: ({ key, is_enabled }: { key: string; is_enabled: boolean }) =>
      setTenantFeatureFlag(id!, key, { is_enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-flags', id] })
    },
  })

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading tenant...</div>
  }
  if (!tenant) {
    return <div className="text-center text-muted-foreground py-8">Tenant not found</div>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenants"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
            <Badge variant={statusColor(tenant.status)}>{tenant.status}</Badge>
          </div>
          <p className="text-muted-foreground">Slug: {tenant.slug}</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="plans">Subscription</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Name</Label>
                <Input
                  id="tenant-name"
                  defaultValue={tenant.name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={tenant.slug} disabled />
              </div>
              <div className="space-y-2">
                <Label>Subdomain</Label>
                <Input value={tenant.subdomain || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Schema</Label>
                <Input value={tenant.schema_name} disabled />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { if (confirm('Are you sure?')) deleteMutation.mutate() }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Tenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Users</CardTitle>
                <Button asChild size="sm">
                  <Link to={`/tenants/${id}/users`}>
                    <Users className="mr-2 h-4 w-4" /> Manage Users
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage members, roles, and invitations for this tenant.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.filter((p) => p.is_active).map((plan) => (
                  <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-2xl font-bold">
                        ${(plan.price_cents / 100).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      <p>Max users: {plan.max_users}</p>
                      <p>Storage: {plan.max_storage_mb} MB</p>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => subscribeMutation.mutate(plan.id)}
                        disabled={subscribeMutation.isPending}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button
                variant="destructive"
                onClick={() => cancelSubMutation.mutate()}
                disabled={cancelSubMutation.isPending}
              >
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenantFlags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feature flags configured.</p>
                ) : (
                  tenantFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{flag.flag_name}</p>
                        <p className="text-sm text-muted-foreground">{flag.flag_key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {flag.is_overridden && (
                          <Badge variant="warning">Overridden</Badge>
                        )}
                        <Switch
                          checked={flag.is_enabled}
                          onCheckedChange={(checked) =>
                            flagMutation.mutate({ key: flag.flag_key, is_enabled: checked })
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTenantUsers, inviteUser, updateUserRole, removeUser } from '@/api/tenants'
import type { InviteUserRequest, UpdateRoleRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, UserPlus, Shield, UserX } from 'lucide-react'

export default function TenantUsers() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['tenant-users', id],
    queryFn: () => listTenantUsers(id!),
    enabled: !!id,
  })

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserRequest) => inviteUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', id] })
      setDialogOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      toast({ title: 'User invited', variant: 'success' })
    },
    onError: (err: unknown) => {
      let msg = 'Invite failed'
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

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UpdateRoleRequest['role'] }) =>
      updateUserRole(id!, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', id] })
      toast({ title: 'Role updated', variant: 'success' })
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' }),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeUser(id!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', id] })
      toast({ title: 'User removed', variant: 'success' })
    },
    onError: () => toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' }),
  })

  const roleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'default'
      case 'admin': return 'secondary'
      case 'member': return 'outline'
      case 'viewer': return 'outline'
      default: return 'outline'
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'invited': return 'warning'
      case 'disabled': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/tenants/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage users and roles for this tenant.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
              }}
            >
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Invite a registered user to this tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v: 'member' | 'admin' | 'viewer') => setInviteRole(v)}
                  >
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading users...</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No users in this tenant yet.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={roleColor(user.role)}>{user.role}</Badge>
                        {user.role !== 'owner' && (
                          <Select
                            defaultValue={user.role}
                            onValueChange={(v: UpdateRoleRequest['role']) =>
                              roleMutation.mutate({ userId: user.user_id, role: v })
                            }
                          >
                            <SelectTrigger className="h-7 w-24">
                              <Shield className="h-3 w-3" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role !== 'owner' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${user.full_name} from this tenant?`))
                              removeMutation.mutate(user.user_id)
                          }}
                          disabled={removeMutation.isPending}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

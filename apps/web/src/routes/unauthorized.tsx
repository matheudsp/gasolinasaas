// app/routes/unauthorized.tsx
import { useSignOut } from "@/hooks/use-sign-out"
import { createFileRoute } from "@tanstack/react-router"


export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
    const { signOut } = useSignOut()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-sm">
        <span className="text-5xl">🚫</span>
        <h1 className="text-xl font-bold text-gray-900">Acesso não autorizado</h1>
        <p className="text-sm text-gray-500">
          Sua conta não está vinculada a nenhuma rede de postos. Entre em contato com o
          administrador.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 text-sm text-blue-600 underline underline-offset-2"
        >
          Sair e usar outra conta
        </button>
      </div>
    </div>
  )
}
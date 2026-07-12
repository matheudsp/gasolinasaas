import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoyaltyAudit } from "./LoyaltyAudit";
import { RewardsManager } from "./RewardsManager";
import { LoyaltyConfig } from "./LoyaltyConfig";

export default function LoyaltyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fidelidade</h1>
        <p className="text-muted-foreground text-sm">
          Auditoria do programa, recompensas e configurações.
        </p>
      </div>

      <Tabs defaultValue="auditoria">
        <TabsList>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="recompensas">Recompensas</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="auditoria" className="mt-6">
          <LoyaltyAudit />
        </TabsContent>
        <TabsContent value="recompensas" className="mt-6">
          <RewardsManager />
        </TabsContent>
        <TabsContent value="config" className="mt-6">
          <LoyaltyConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Module } from "@nestjs/common";
import { HitlGatewayModule } from "../hitl-gateway/hitl-gateway.module";
import { GoogleWorkspaceConnectorService } from "./google-workspace-connector.service";

@Module({ imports: [HitlGatewayModule], providers: [GoogleWorkspaceConnectorService], exports: [GoogleWorkspaceConnectorService] })
export class GoogleWorkspaceConnectorModule {}

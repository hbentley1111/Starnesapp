import { Module } from "@nestjs/common";
import { AuthRbacService } from "./auth-rbac.service";

@Module({ providers: [AuthRbacService], exports: [AuthRbacService] })
export class AuthRbacModule {}

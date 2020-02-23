import { loadSync } from "@grpc/proto-loader";

import {
  loadPackageDefinition,
  Server,
  ServerCredentials
} from "grpc";

import { join } from "path";
import { readFileSync } from "fs";
import { SSLCred } from ".";

export class RPCError extends Error {
  public readonly code: number;
  public readonly details: string;
  constructor(code: number, details: string) {
    super(details);
    this.code = code;
    this.details = details;
  }
}

export interface IProtoService {
  protoFile: string;
  packageName: string;
  serviceName: string;
  hooks: {
    [key: string]: any;
  }
}

export interface ISetup {
  services: Array<IProtoService>;
  protoRoot: string;
};

export const createServerCreds = (ssl: SSLCred = undefined): ServerCredentials => {
  
  if (!ssl || !Array.isArray(ssl)) return ServerCredentials.createInsecure();
  
  if(ssl.length <= 3) {
    console.warn("Invalid Certificates, falling to insecure connection");
    return ServerCredentials.createInsecure();
  }
  
  const [
    root,
    cert,
    key
  ] = ssl;
  
  return ServerCredentials.createSsl(
    Buffer.isBuffer(root) ? root : readFileSync(root),
    [
      {
        cert_chain: Buffer.isBuffer(cert) ? cert : readFileSync(cert),
        private_key: Buffer.isBuffer(key) ? key : readFileSync(key)
      }
    ]
  );
};



const loadProtoFiles = ({ services = [], protoRoot = "" }: ISetup, server: Server) => {
  services.forEach(({ protoFile, packageName, serviceName, hooks }) => {
    const protoBuf = loadSync(join(protoRoot, protoFile), {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const orderService = loadPackageDefinition(protoBuf) as any;

    const newHooks = Object.entries(hooks).reduce((total, current) => {
      const [key, value] = current as [string, (data: { request: any }) => Promise<any>];
      return {
        ...total,
        [key]: (data: any, cb: any) => {
          value(data.request)
            .then((e: any) => cb(null, e))
            .catch(({ code = 1, message = "UnexpectedError" }) => cb({ code, message }));
        }
      }
    }, {});

    server.addService(orderService[packageName][serviceName].service, {
      ...newHooks
    });
  });
}


  
  
export const createServer = (setup: ISetup, domain: string, cred?: ServerCredentials): Server => {
  const server = new Server();
  loadProtoFiles(setup, server);
  server.bind(domain, cred || createServerCreds());
  return server;
}


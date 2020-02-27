
import { 
  loadPackageDefinition, 
  credentials, 
  ChannelCredentials 
} from 'grpc';
import { loadSync, Options } from "@grpc/proto-loader";
import { SSLCred, protoLoaderOptions } from '.';
import { readFileSync } from 'fs';

export const createClientCreds = (ssl: SSLCred = undefined): ChannelCredentials => {
  if(!ssl)
    return credentials.createInsecure();

  const [
    root,
    cert_chain,
    private_key
  ] = ssl;

  return credentials.createSsl(
    Buffer.isBuffer(root) ? root : readFileSync(root),
    Buffer.isBuffer(cert_chain) ? cert_chain : readFileSync(cert_chain),
    Buffer.isBuffer(private_key) ? private_key : readFileSync(private_key),
  );
};

export interface IClientService {
  url: string;
  port: string;
  packageName: string,
  serviceName: string,
  protoPath: string;
  calls: string[];
  options?: Options;
  credentials?: ChannelCredentials;
}

export const createClient = <K extends {}>(service: IClientService): K => {
    const {
      packageName,
      serviceName,
      protoPath,
      port,
      url,
      calls,
      options = protoLoaderOptions,
      credentials = createClientCreds()
    } = service;

    const packageDefinition = loadSync(protoPath, options);

    const protoFile = loadPackageDefinition(packageDefinition) as any;
    var client = new protoFile[packageName][serviceName](`${url}:${port}`, credentials);

    return calls.reduce((total: any, call: any) => {
      return {
        ...total,
        [call]: (data: any) => new Promise((res, rej) => {
            client[call](data, (er: any, response: any) => {
              if(er){
                rej(er);
                return;
              } 
              res(response);
            })
        }) 
      }
    }, {}) as K;
};
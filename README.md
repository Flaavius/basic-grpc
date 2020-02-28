# A simple grpc Wrapper for nodejs

*basic-grpc* is a small wrapper over grpc and @grpc/proto-loader
its goal is to make the implementation very basic with minimal setup.

## Usage:

  ### Example proto file 
  *_protos/login.proto_*

  ```
    syntax = "proto3";

    package login;

    service Login {
      rpc login (Credentials) returns (Token) {}
    }

    message Credentials {
      string username = 1;
      string password = 2;
    }

    message Token {
      string token = 1;
    }
  ```

  if you are using typescript you can also create a declaration file:

  *_protos/login.d.ts_*
  
```typescript
  import { rpc } from "simple-grpc";

  export interface ILogin {
    login: rpc<ICredentials, IToken>;
  }

  export interface ICredentials {
    username: string;
    password: string;
  }

  export interface IToken {
    token: string;
  }
```

  ### Create a service
  *_grpcServer.ts_*
  ```typescript
  import { 
    createServer, 
    ISetup,
    IProtoService, 
    RPCError, 
    createServerCreds
  } from "simple-grpc";

  import { join } from "path";
  import { ILogin } from "../protos/login";

  const loginService: IProtoService<ILogin> = {
    protoFile: "login.proto", // the .proto fileName
    packageName: "login", // packageName (what is defined in the .proto file as package)
    serviceName: "Login",  // serviceName (what is defined in the .proto file as Service)
    handlers: { // the function handlers for every rpc call
      login: async ({ username, password }) => {
        if(password === "awesomeSecretPassword") 
          return  {
            token: generateToken(username)
          };
          
        // you can throw an RPCError  with a code and details for the error 
        // the first 15 are gRPC generic you can add custom errors from 15+
        // see: https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
        throw new RPCError(22, "Invalid Credentials");
      }
    },
  };

  const gRPCSetup: ISetup = {
    protoRoot: join(__dirname, "..", "protos"), // root folder where all your .proto files live
    services: [ // a list of services for this particular server
      loginService
    ]
  };

  // options for the protoloader
  const protoLoaderOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  };

  // the host of your gRPC server
  const domain = "localhost:50051";

  // accepts and array of Buffers or strings (truple) [ rootCerts, cert_chain, private_key ] 
  // or it can create an insecure connection if nothing is passed
  const credentials = createServerCreds();

  // returns a gRPC server instance 
  const server = createServer({
    gRPCSetup,
    domain,
    options: protoLoaderOptions, // if not passed it will use the default values
    credentials, // if not passed it will create an insecure connection
  });
  
  // starts the server :)
  server.start();
  console.log("Server Started");
  ```
### Create a client
  *_client.ts_*
  ```typescript
  import { createClient, createClientCreds } from "simple-grpc";
  import { ILogin } from "../protos/login";
  import { join } from "path";

  const protoLoaderOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  };

  // accepts and array of Buffers or strings (truple) [ rootCerts, cert_chain, private_key ] 
  // or it can create an insecure connection if nothing is passed
  const credentials = createClientCreds();

  const loginService = createClient<ILogin>({
    url: "localhost", // url of the gRPC Server 
    port: "50051", // port of the gRPC server 
    protoPath: join(__dirname, ".." , "protos", "login.proto"), // root folder of your .protoFiles
    packageName: "login",  // packageName (what is defined in the .proto file as package)
    serviceName: "Login", // serviceName (what is defined in the .proto file as Service)
    options: protoLoaderOptions, // if not passed it will use the default values
    credentials, // if not passed it will create an insecure connection
    calls: [ "login" ] // the available rpc calls to that service defined in the .proto file
  });


  try {
    // you can then call the login function for the loginService :)
    // it will return a promise with the data or it Will throw an RPCError with code and details.
    const data = await loginService.login({ username: "JohnDoe", password: "awesomeSecretPassword" });
    console.log(JSON.stringify(data, undefined, 2));
  } catch ({ code, details }) {
    console.log("ERR", code, details);
  }
  ```

  #### check this repo for an example: https://github.com/Flaavius/basic-grpc-example
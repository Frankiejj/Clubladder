declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export interface ServeInit {
    port?: number;
    onListen?: (addr: { hostname: string; port: number }) => void;
    signal?: AbortSignal;
    onError?: (error: Error) => Response | void;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    opts?: ServeInit
  ): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
  const createClient: typeof import("@supabase/supabase-js").createClient;
  export { createClient };
}


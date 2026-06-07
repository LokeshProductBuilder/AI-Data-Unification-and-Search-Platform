import { Inngest, EventSchemas } from "inngest";
import type { Provider } from "@prisma/client";

type Events = {
  "mailbox/sync.requested": {
    data: {
      accountId: string;
      provider: Provider;
    };
  };
};

export const inngest = new Inngest({
  id: "unified",
  schemas: new EventSchemas().fromRecord<Events>(),
});

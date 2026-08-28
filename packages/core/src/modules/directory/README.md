Directory module: tenants and org units — the internal hierarchy of branches,
departments and subsidiaries a tenant is divided into (MikroORM entities and
services).

The entity is called `Organization` and the table `organizations`, but this is
the *internal* org unit, not the customer. The party you sell to is
`customers.CustomerEntity`. See the doc comment on `Organization` in
`data/entities.ts` for why the name is kept.

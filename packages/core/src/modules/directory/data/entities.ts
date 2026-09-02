import { Collection } from '@mikro-orm/core'
import { Entity, ManyToOne, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

@Entity({ tableName: 'tenants' })
export class Tenant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null

  @OneToMany(() => Organization, (o) => o.tenant)
  organizations = new Collection<Organization>(this)
}

/**
 * An org unit — one node in a tenant's internal hierarchy (branch, department,
 * subsidiary). It is the scope every record is filed under: the `organizationId`
 * column carried by ~every entity in the app points here.
 *
 * This is NOT the party you sell to. In most ERPs "organization" means the
 * external company; here that is `customers.CustomerEntity` (kind 'company' |
 * 'person'), whose company details live in `CustomerCompanyProfile`. A
 * customer's `organizationId` is the internal org unit that owns the record,
 * not the customer's own company.
 *
 * The naming audit proposed renaming this to OrgUnit. Measured, the word is
 * held by contracts rather than by being the better word: the entity id
 * `directory:organization` is derived from this class name by the generator
 * (packages/cli/src/lib/generators/entity-ids.ts, `toSnake(clsName)`, no
 * override) and is stored in custom field values and query-index documents; the
 * ACL features directory.organizations.view / .manage are granted to roles and
 * stored in the database; `organizationId` appears ~22k times across the repo;
 * /api/directory/organizations and the om_selected_org cookie are wire
 * contracts. Renaming only the class would leave one concept under two names.
 *
 * Search for "org unit", "branch" or "department" and land here.
 */
@Entity({ tableName: 'organizations' })
@Unique({ name: 'organizations_tenant_slug_uniq', properties: ['tenant', 'slug'] })
export class Organization {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => Tenant)
  tenant!: Tenant

  @Property({ type: 'text' })
  name!: string

  @Property({ type: 'text', nullable: true })
  slug?: string | null

  @Property({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null

  @Property({ name: 'logo_preserve_aspect_ratio', type: 'boolean', default: false })
  logoPreserveAspectRatio: boolean = false

  @Property({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true

  @Property({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null = null

  @Property({ name: 'root_id', type: 'uuid', nullable: true })
  rootId: string | null = null

  @Property({ name: 'tree_path', type: 'text', nullable: true })
  treePath: string | null = null

  @Property({ type: 'int', default: 0 })
  depth: number = 0

  @Property({ name: 'ancestor_ids', type: 'jsonb', default: [], nullable: false })
  ancestorIds: string[] = []

  @Property({ name: 'child_ids', type: 'jsonb', default: [], nullable: false })
  childIds: string[] = []

  @Property({ name: 'descendant_ids', type: 'jsonb', default: [], nullable: false })
  descendantIds: string[] = []

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

export interface ModuleManifest {
  /** Unique module identifier (e.g. 'rate-my-professor', 'marketplace', 'confessions') */
  readonly id: string;
  /** Human readable module name */
  readonly name: string;
  /** SemVer module version string */
  readonly version: string;
  /** Minimum required kernel version string */
  readonly minKernelVersion: string;
  /** Array of module IDs this module depends on */
  readonly dependencies: string[];
  /** Array of security permission keys declared by this module */
  readonly permissions: string[];
  /** Base HTTP route prefix */
  readonly routesPrefix?: string;
}

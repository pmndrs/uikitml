export type KitName = 'uikit-default' | 'uikit-lucide' | 'uikit-horizon'

interface KitComponentInfo {
  componentName: string
  kits: KitName[]
}

class KitRegistry {
  private componentMap: Map<string, KitName[]> = new Map()
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  async initialize() {
    if (this.initialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.buildRegistry()
    await this.initPromise
  }

  private async buildRegistry() {
    try {
      // Dynamically import each kit
      const [defaultKit, lucideKit, horizonKit] = await Promise.all([
        import('@pmndrs/uikit-default'),
        import('@pmndrs/uikit-lucide'),
        import('@pmndrs/uikit-horizon'),
      ])

      // Process each kit
      this.registerKit('uikit-default', defaultKit as any)
      this.registerKit('uikit-lucide', lucideKit as any)
      this.registerKit('uikit-horizon', horizonKit as any)

      this.initialized = true
    } catch (error) {
      console.error('Failed to load kit modules:', error)
      // Set as initialized anyway to prevent infinite retry
      this.initialized = true
    }
  }

  private registerKit(kitName: KitName, kit: Record<string, any>) {
    // Extract component names from the kit
    for (const [componentName] of Object.entries(kit)) {
      // Skip default export and other non-component exports
      if (componentName === 'default' || componentName.startsWith('_')) {
        continue
      }

      // Normalize to lowercase for case-insensitive matching
      const normalizedName = componentName.toLowerCase()

      if (!this.componentMap.has(normalizedName)) {
        this.componentMap.set(normalizedName, [])
      }

      this.componentMap.get(normalizedName)!.push(kitName)
    }
  }

  /**
   * Check if a component exists in any kit (case-insensitive)
   * @param componentName The component name to check
   * @returns The kits that contain this component, or undefined if not found
   */
  getKitsForComponent(componentName: string): KitName[] | undefined {
    const normalizedName = componentName.toLowerCase()
    return this.componentMap.get(normalizedName)
  }

  /**
   * Check if a component exists in any kit
   */
  isValidKitComponent(componentName: string): boolean {
    return this.getKitsForComponent(componentName) !== undefined
  }

  /**
   * Get all registered component names
   */
  getAllComponents(): string[] {
    return Array.from(this.componentMap.keys())
  }
}

// Export a singleton instance
export const kitRegistry = new KitRegistry()

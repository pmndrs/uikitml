import { BaseOutProperties, Container, InProperties, RenderContext, WithSignal, Input } from '@pmndrs/uikit'
import { Kit } from './index.js'

export const htmlKit: Kit = {
  h1: class H1 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          fontSize: 24,
          fontWeight: 'bold',
          ...config?.defaultOverrides,
        },
      })
    }
  },
  h2: class H2 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          fontSize: 24,
          fontWeight: 'bold',
          ...config?.defaultOverrides,
        },
      })
    }
  },
  h3: class H3 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          fontSize: 18.72,
          fontWeight: 'bold',
          ...config?.defaultOverrides,
        },
      })
    }
  },
  h4: class H4 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: { fontSize: 16, fontWeight: 'bold', ...config?.defaultOverrides },
      })
    }
  },
  h5: class H5 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: { fontSize: 13.28, fontWeight: 'bold', ...config?.defaultOverrides },
      })
    }
  },
  h6: class H6 extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          //tailwind disables this marginY: 37.28,
          fontSize: 10.67,
          fontWeight: 'bold',
          ...config?.defaultOverrides,
        },
      })
    }
  },
  ol: class OL extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: { flexDirection: 'column', ...config?.defaultOverrides },
      })
    }
  },
  ul: class UL extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: { flexDirection: 'column', ...config?.defaultOverrides },
      })
    }
  },
  a: class A extends Container<{ href?: string } & BaseOutProperties> {
    constructor(
      inputProperties?: InProperties<{ href?: string } & BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<{ href?: string } & BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          cursor: 'pointer',
          onClick: (e) => {
            e.stopPropagation?.()
            const href = this.properties.peek().href
            if (href != null) {
              window.open(href)
            }
          },
          ...config?.defaultOverrides,
        },
      })
    }
  },
  button: class Button extends Container {
    constructor(
      inputProperties?: InProperties<BaseOutProperties>,
      initialClasses?: Array<InProperties<BaseOutProperties> | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: InProperties<BaseOutProperties>
        defaults?: WithSignal<BaseOutProperties>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: {
          verticalAlign: 'middle',
          textAlign: 'center',
          cursor: 'pointer',
          ...config?.defaultOverrides,
        },
      })
    }
  },
  textarea: class Textarea extends Input {
    constructor(
      inputProperties?: any,
      initialClasses?: Array<any | string>,
      config?: {
        renderContext?: RenderContext
        defaultOverrides?: Record<string, any>
        defaults?: WithSignal<Record<string, any>>
      },
    ) {
      super(inputProperties, initialClasses, {
        ...config,
        defaultOverrides: { multiline: true, ...config?.defaultOverrides },
      } as any)
    }
  },
}
//TBD select option

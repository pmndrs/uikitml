import React, { useState, useEffect } from 'react'
import { useComponentStore } from '../store'
import { PropertyEditor, VSCodeApi } from '../../core/property-editor'
import { PropertyInput } from './property-input'
import { ComponentInfo } from './component-info'
import { ActionButtons } from './action-button'
import { propertyConfigs } from '../../../shared/property-config'

interface PropertiesPanelProps {
  vscode: VSCodeApi
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ vscode }) => {
  const { selectedComponent, rootContainer } = useComponentStore()
  const activeComponent = selectedComponent || rootContainer

  // Create property editor instance
  const [propertyEditor] = useState(() => new PropertyEditor(vscode))

  // Single state object for all properties
  const [propertyValues, setPropertyValues] = useState<Record<string, any>>({})

  // Update property editor and states when component changes
  useEffect(() => {
    propertyEditor.setComponent(activeComponent)

    if (!activeComponent) {
      setPropertyValues({})
      return
    }

    const currentProps = activeComponent.properties.value as any
    const newValues: Record<string, any> = {}

    propertyConfigs.forEach((config) => {
      newValues[config.key] = currentProps[config.key]
    })

    setPropertyValues(newValues)
  }, [activeComponent, propertyEditor])

  const updateProperty = (key: string, value: any) => {
    propertyEditor.updateProperty(key, value)
    // Update the local state
    setPropertyValues((prev) => ({ ...prev, [key]: value }))
  }

  const resetChanges = () => {
    propertyEditor.resetChanges()

    if (!activeComponent) return

    // Update local state with reset values
    const currentProps = activeComponent.properties.value as any
    const newValues: Record<string, any> = {}

    propertyConfigs.forEach((config) => {
      newValues[config.key] = currentProps[config.key]
    })

    setPropertyValues(newValues)
  }

  const applyChanges = () => {
    propertyEditor.applyChanges()
  }

  if (!activeComponent) {
    return (
      <div className="properties-panel">
        <span className="no-selection">No component selected</span>
      </div>
    )
  }

  return (
    <div className="properties-panel">
      <ComponentInfo
        componentId={propertyEditor.getComponentId()}
        componentClass={propertyEditor.getComponentClass()}
        onIdClick={() => propertyEditor.jumpToId()}
        onClassClick={(className) => propertyEditor.jumpToClass(className)}
      />
      <div className="properties-content">
        {propertyConfigs.map((config) => {
          const value = propertyValues[config.key]
          return (
            <PropertyInput
              key={config.key}
              label={config.label}
              value={value}
              originalValue={propertyEditor.getOriginalValue(config.key)}
              onChange={(value) => updateProperty(config.key, value)}
              type={config.type}
              options={config.options}
            />
          )
        })}
      </div>
      <ActionButtons onReset={resetChanges} onApply={applyChanges} hasChanges={propertyEditor.hasPendingChanges()} />
    </div>
  )
}

import React from 'react'

export interface ComponentInfoProps {
  componentId: string
  componentClass: string
  onIdClick: () => void
  onClassClick: (className: string) => void
}

export const ComponentInfo: React.FC<ComponentInfoProps> = ({
  componentId,
  componentClass,
  onIdClick,
  onClassClick,
}) => {
  // Get component identification info
  const componentClasses = typeof componentClass === 'string' ? componentClass.split(' ').filter(Boolean) : []

  return (
    <div className="component-info">
      {componentId && (
        <span className="component-id clickable" onClick={onIdClick}>
          #{componentId}
        </span>
      )}
      {componentClasses.map((className) => (
        <span key={className} className="component-class clickable" onClick={() => onClassClick(className)}>
          .{className}
        </span>
      ))}
    </div>
  )
}

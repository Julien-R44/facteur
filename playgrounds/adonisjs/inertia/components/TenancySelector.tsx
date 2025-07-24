import { useState } from 'react'
import { Building2, ChevronDown } from 'lucide-react'

interface Organization {
  id: string
  name: string
  color: string
}

interface TenancySelectorProps {
  currentTenant: Organization
  onTenantChange: (tenant: Organization) => void
}

const organizations: Organization[] = [
  { id: 'acme-corp', name: 'Acme Corporation', color: 'bg-blue-500' },
  { id: 'tech-startup', name: 'Tech Startup Inc.', color: 'bg-green-500' },
  { id: 'consulting-firm', name: 'Consulting Firm Ltd.', color: 'bg-purple-500' },
  { id: 'creative-agency', name: 'Creative Agency', color: 'bg-orange-500' },
]

export default function TenancySelector({ currentTenant, onTenantChange }: TenancySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleTenantChange = (tenant: Organization) => {
    onTenantChange(tenant)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <div className={`w-3 h-3 rounded-full ${currentTenant.color}`} />
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">{currentTenant.name}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Switch Organization
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleTenantChange(org)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                  currentTenant.id === org.id
                    ? 'bg-blue-50 text-blue-900'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${org.color}`} />
                <span className="text-sm font-medium">{org.name}</span>
                {currentTenant.id === org.id && (
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}

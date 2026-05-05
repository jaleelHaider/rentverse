import React, { useState } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'

const LanguageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'ps', name: 'Pashto', nativeName: 'پښتو' }
  ]

  const currentLang = languages.find(lang => lang.code === selectedLang)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm hover:text-primary-200"
      >
        <Globe size={16} />
        <span>{currentLang?.code.toUpperCase()}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Language</h3>
              <div className="space-y-2">
                {languages.map(language => (
                  <button
                    key={language.code}
                    onClick={() => {
                      setSelectedLang(language.code)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedLang === language.code ? 'bg-primary-50 border border-primary-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-6 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-sm">{language.code.toUpperCase()}</span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{language.name}</div>
                        <div className="text-xs text-gray-500">{language.nativeName}</div>
                      </div>
                    </div>
                    {selectedLang === language.code && (
                      <Check size={16} className="text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  More languages coming soon. 
                  <a href="#" className="text-primary-600 hover:underline ml-1">
                    Request a language
                  </a>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default LanguageSelector

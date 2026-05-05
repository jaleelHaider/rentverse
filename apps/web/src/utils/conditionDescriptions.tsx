import { Award, AlertTriangle, CheckCircle, RefreshCw, Star } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ConditionDescription {
  id: string;
  name: string;
  icon: ReactNode;
  color: string;
  fullDescription: string;
}

export interface ConditionIssueOption {
  id: string;
  label: string;
  description: string;
}

export const CONDITION_DESCRIPTIONS: Record<string, ConditionDescription> = {
  new: {
    id: 'new',
    name: 'Brand New',
    icon: <Award className="h-6 w-6" />,
    color: 'bg-green-100 text-green-800',
    fullDescription: 'Never used, with original tags, packaging, and accessories included.',
  },
  like_new: {
    id: 'like_new',
    name: 'Like New',
    icon: <Star className="h-6 w-6" />,
    color: 'bg-blue-100 text-blue-800',
    fullDescription: 'Used gently with almost no visible wear and no functional issues.',
  },
  good: {
    id: 'good',
    name: 'Good',
    icon: <CheckCircle className="h-6 w-6" />,
    color: 'bg-teal-100 text-teal-800',
    fullDescription: 'Fully functional with normal wear and tear from regular use.',
  },
  fair: {
    id: 'fair',
    name: 'Fair',
    icon: <RefreshCw className="h-6 w-6" />,
    color: 'bg-yellow-100 text-yellow-800',
    fullDescription: 'Shows visible wear or cosmetic marks, but still works properly.',
  },
  poor: {
    id: 'poor',
    name: 'Needs Work',
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'bg-orange-100 text-orange-800',
    fullDescription: 'Functional but needs repair, cleaning, or restoration before regular use.',
  },
};

export const CONDITION_ISSUES_OPTIONS: ConditionIssueOption[] = [
  { id: 'scratches', label: 'Scratches', description: 'Surface scratches or scuffs are visible.' },
  { id: 'dents', label: 'Dents', description: 'Small dents or shape deformation.' },
  { id: 'stains', label: 'Stains', description: 'Noticeable stains or discoloration.' },
  { id: 'missing_parts', label: 'Missing Parts', description: 'One or more accessories or parts are missing.' },
  { id: 'battery_wear', label: 'Battery Wear', description: 'Battery life is reduced from normal.' },
  { id: 'cosmetic_damage', label: 'Cosmetic Damage', description: 'Visible cosmetic wear but item still works.' },
  { id: 'repairs_needed', label: 'Repairs Needed', description: 'Item needs servicing or repair before use.' },
  { id: 'packaging_missing', label: 'No Packaging', description: 'Original box or packaging is not available.' },
];

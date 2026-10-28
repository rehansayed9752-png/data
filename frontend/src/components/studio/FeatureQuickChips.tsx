import React, { useState } from 'react';
import { Sparkles, Tag, ChevronRight } from 'lucide-react';
import { FacialStateJSON } from '../../types/forensic';

interface FeatureQuickChipsProps {
  onSelectTrait: (traitCategory: keyof FacialStateJSON, traitValue: string, promptSnippet: string) => void;
  disabled?: boolean;
}

interface TraitCategory {
  key: keyof FacialStateJSON;
  title: string;
  chips: { label: string; value: string; prompt: string }[];
}

const TRAIT_CATEGORIES: TraitCategory[] = [
  {
    key: 'jawline_chin',
    title: 'Jaw & Chin',
    chips: [
      { label: 'Square Jaw', value: 'Broad square mandibular jawline with blunt chin', prompt: 'Make the jawline broad, sharp, and square.' },
      { label: 'Narrow Pointed Chin', value: 'Tapered angular jaw with narrower pointed chin', prompt: 'Make the chin narrower and more pointed with a tapered jawline.' },
      { label: 'Deep Cleft Chin', value: 'Pronounced vertical cleft groove in center of chin', prompt: 'Add a distinct cleft indentation in the center of the chin.' },
      { label: 'Heavy Mandible', value: 'Heavy wide mandibular gonial angle with strong bone ridge', prompt: 'Widen the lower mandible for a heavier bone structure.' },
    ],
  },
  {
    key: 'eyes',
    title: 'Eyes & Brows',
    chips: [
      { label: 'Narrow Almond', value: 'Narrow deep-set almond eyes, hooded palpebral fold', prompt: 'Narrow the eyes into almond-shaped slits with hooded lids.' },
      { label: 'Bushy Thick Brows', value: 'Very thick bushy dark eyebrows with low horizontal arch', prompt: 'Make the eyebrows thicker, darker, and bushy.' },
      { label: 'Wide-Set Eyes', value: 'Almond eyes positioned with wider interpupillary distance', prompt: 'Set the eyes slightly wider apart from each other.' },
      { label: 'Deep Periorbital Bags', value: 'Pronounced dark under-eye fatigue bags and hollows', prompt: 'Add dark fatigue shadows and periorbital bags under the eyes.' },
    ],
  },
  {
    key: 'nose',
    title: 'Nose & Cheeks',
    chips: [
      { label: 'Hooked / Broken Tip', value: 'Crooked bridge with slight hooked downward tip from suspected fracture', prompt: 'Make the nose bridge crooked with a slight hooked downward tip.' },
      { label: 'High Cheekbones', value: 'High prominent zygomatic arches, sunken lower cheeks', prompt: 'Sharpen and elevate the cheekbones with sunken lower cheeks.' },
      { label: 'Broad Nasal Base', value: 'Flared alar base with wide nostrils', prompt: 'Widen the nostrils and nasal base.' },
      { label: 'Straight Thin Bridge', value: 'Straight narrow aquiline nose bridge', prompt: 'Make the nose bridge straight, thin, and symmetrical.' },
    ],
  },
  {
    key: 'facial_hair',
    title: 'Beard & Stubble',
    chips: [
      { label: 'Heavy 5 O\'Clock Shadow', value: 'Dense dark 5-o-clock stubble across lower cheeks and jaw', prompt: 'Add dense dark 5 o-clock stubble across the jaw and chin.' },
      { label: 'Pencil Thin Mustache', value: 'Trimmed pencil mustache contour along upper lip margin', prompt: 'Add a neat pencil-thin dark mustache above the upper lip.' },
      { label: 'Rough Goatee', value: 'Short trimmed goatee patch beneath lower lip and chin', prompt: 'Add a short, rough dark goatee on the chin.' },
      { label: 'Clean Shaven', value: 'Smooth clean-shaven lower face with visible bone contours', prompt: 'Remove all facial hair and stubble for a clean-shaven appearance.' },
    ],
  },
  {
    key: 'scars_marks_tattoos',
    title: 'Scars & Identifying Marks',
    chips: [
      { label: 'Right Brow Scar', value: 'Two-inch vertical knife scar above right eyebrow', prompt: 'Add a distinct 2-inch vertical scar above the right eyebrow.' },
      { label: 'Left Cheek Scar', value: 'Diagonal knife scar across left cheekbone', prompt: 'Add a 1.5-inch diagonal scar across the left cheek.' },
      { label: 'Mole Near Mouth', value: 'Dark raised mole 1cm to the right of upper lip commissure', prompt: 'Add a small prominent dark mole near the right corner of the mouth.' },
      { label: 'Burn Texture Mark', value: 'Irregular healed burn discoloration on right temple', prompt: 'Add faint healed burn tissue texture along the right temple.' },
    ],
  },
  {
    key: 'accessories',
    title: 'Accessories',
    chips: [
      { label: 'Wire-Rim Glasses', value: 'Thin rectangular silver wire-rim prescription spectacles', prompt: 'Add thin rectangular silver wire-frame glasses.' },
      { label: 'Ear Stud', value: 'Small silver metallic stud in left earlobe', prompt: 'Add a small metallic stud piercing in the left earlobe.' },
      { label: 'No Accessories', value: 'No glasses, jewelry, or headgear', prompt: 'Remove any glasses or facial accessories.' },
    ],
  },
];

export const FeatureQuickChips: React.FC<FeatureQuickChipsProps> = ({
  onSelectTrait,
  disabled,
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof FacialStateJSON>('jawline_chin');

  const currentCategory = TRAIT_CATEGORIES.find(c => c.key === activeCategory) || TRAIT_CATEGORIES[0];

  return (
    <div className="bg-[#0b0e15] border border-white/[0.08] rounded-lg p-3">
      {/* Category selector pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.06] mb-2.5">
        <div className="flex items-center space-x-1 text-[10px] font-mono uppercase text-amber-400 font-semibold pr-2">
          <Tag className="w-3 h-3" />
          <span>Traits:</span>
        </div>
        {TRAIT_CATEGORIES.map(category => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`px-2 py-1 rounded text-[11px] whitespace-nowrap transition-all ${
              activeCategory === category.key
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      {/* Trait chips grid */}
      <div className="flex flex-wrap gap-1.5">
        {currentCategory.chips.map(chip => (
          <button
            key={chip.label}
            disabled={disabled}
            onClick={() => onSelectTrait(currentCategory.key, chip.value, chip.prompt)}
            className="group flex items-center space-x-1 px-2.5 py-1 rounded bg-[#131722] hover:bg-amber-500/15 border border-white/[0.08] hover:border-amber-500/40 text-xs text-zinc-300 hover:text-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-amber-400/80 group-hover:text-amber-300 font-mono text-[11px]">+</span>
            <span>{chip.label}</span>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

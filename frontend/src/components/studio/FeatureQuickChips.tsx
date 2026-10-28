import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Sparkles } from 'lucide-react';
import { FacialStateJSON } from '../../types/forensic';
import { buttonHoverLift } from '../../styles/tokens';

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
      { label: 'Pointed Chin', value: 'Tapered angular jaw with narrower pointed chin', prompt: 'Make the chin narrower and more pointed with a tapered jawline.' },
      { label: 'Cleft Chin', value: 'Pronounced vertical cleft groove in center of chin', prompt: 'Add a distinct cleft indentation in the center of the chin.' },
      { label: 'Heavy Mandible', value: 'Heavy wide mandibular gonial angle with strong bone ridge', prompt: 'Widen the lower mandible for a heavier bone structure.' },
    ],
  },
  {
    key: 'eyes',
    title: 'Eyes & Brows',
    chips: [
      { label: 'Narrow Almond', value: 'Narrow deep-set almond eyes, hooded palpebral fold', prompt: 'Narrow the eyes into almond-shaped slits with hooded lids.' },
      { label: 'Bushy Brows', value: 'Very thick bushy dark eyebrows with low horizontal arch', prompt: 'Make the eyebrows thicker, darker, and bushy.' },
      { label: 'Wide-Set Eyes', value: 'Almond eyes positioned with wider interpupillary distance', prompt: 'Set the eyes slightly wider apart from each other.' },
      { label: 'Under-Eye Bags', value: 'Pronounced dark under-eye fatigue bags and hollows', prompt: 'Add dark fatigue shadows and periorbital bags under the eyes.' },
    ],
  },
  {
    key: 'nose',
    title: 'Nose & Cheeks',
    chips: [
      { label: 'Hooked Bridge', value: 'Crooked bridge with slight hooked downward tip from suspected fracture', prompt: 'Make the nose bridge crooked with a slight hooked downward tip.' },
      { label: 'High Cheekbones', value: 'High prominent zygomatic arches, sunken lower cheeks', prompt: 'Sharpen and elevate the cheekbones with sunken lower cheeks.' },
      { label: 'Broad Nasal Base', value: 'Flared alar base with wide nostrils', prompt: 'Widen the nostrils and nasal base.' },
      { label: 'Straight Aquiline', value: 'Straight narrow aquiline nose bridge', prompt: 'Make the nose bridge straight, thin, and symmetrical.' },
    ],
  },
  {
    key: 'facial_hair',
    title: 'Facial Hair',
    chips: [
      { label: '5 O\'Clock Shadow', value: 'Dense dark 5-o-clock stubble across lower cheeks and jaw', prompt: 'Add dense dark 5 o-clock stubble across the jaw and chin.' },
      { label: 'Pencil Mustache', value: 'Trimmed pencil mustache contour along upper lip margin', prompt: 'Add a neat pencil-thin dark mustache above the upper lip.' },
      { label: 'Trimmed Goatee', value: 'Short trimmed goatee patch beneath lower lip and chin', prompt: 'Add a short, rough dark goatee on the chin.' },
      { label: 'Clean Shaven', value: 'Smooth clean-shaven lower face with visible bone contours', prompt: 'Remove all facial hair and stubble for a clean-shaven appearance.' },
    ],
  },
  {
    key: 'scars_marks_tattoos',
    title: 'Scars & Marks',
    chips: [
      { label: 'Right Brow Scar', value: 'Two-inch vertical knife scar above right eyebrow', prompt: 'Add a distinct 2-inch vertical scar above the right eyebrow.' },
      { label: 'Cheek Scar', value: 'Diagonal knife scar across left cheekbone', prompt: 'Add a 1.5-inch diagonal scar across the left cheek.' },
      { label: 'Facial Mole', value: 'Dark raised mole 1cm to the right of upper lip commissure', prompt: 'Add a small prominent dark mole near the right corner of the mouth.' },
      { label: 'Temple Texture', value: 'Irregular healed burn discoloration on right temple', prompt: 'Add faint healed burn tissue texture along the right temple.' },
    ],
  },
  {
    key: 'accessories',
    title: 'Accessories',
    chips: [
      { label: 'Wire Spectacles', value: 'Thin rectangular silver wire-rim prescription spectacles', prompt: 'Add thin rectangular silver wire-frame glasses.' },
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
    <div className="bg-surface-card border border-line-subtle rounded-lg p-3 font-sans">
      {/* Category selector row */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-line-subtle mb-2.5">
        <div className="flex items-center space-x-1 text-[10.5px] font-mono uppercase tracking-wider text-accent font-semibold pr-2 flex-shrink-0">
          <Tag className="w-3 h-3 text-accent" strokeWidth={1.5} />
          <span>Traits</span>
        </div>
        {TRAIT_CATEGORIES.map(category => {
          const isActive = activeCategory === category.key;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-surface-elevated text-ink-heading font-medium border border-line-medium'
                  : 'text-ink-muted hover:text-ink-body hover:bg-surface-elevated/50'
              }`}
            >
              {category.title}
            </button>
          );
        })}
      </div>

      {/* Trait chips */}
      <div className="flex items-center flex-wrap gap-1.5">
        {currentCategory.chips.map(chip => (
          <motion.button
            key={chip.label}
            type="button"
            variants={buttonHoverLift}
            initial="rest"
            whileHover={disabled ? undefined : 'hover'}
            whileTap={disabled ? undefined : 'tap'}
            disabled={disabled}
            onClick={() => onSelectTrait(currentCategory.key, chip.value, chip.prompt)}
            className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-surface-base hover:bg-surface-elevated border border-line-subtle hover:border-line-medium text-ink-body hover:text-ink-heading text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="w-1 h-1 rounded-full bg-accent group-hover:scale-125 transition-transform"></span>
            <span>{chip.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Typecore Breeze — 데이터(categoriesData.js) + lucide 아이콘 합성. 기존 import 경로/형태 호환.
import {
  Activity, Star, Smile, Feather, PenTool, Edit2, Box, FastForward,
  Clapperboard, MessageSquare, Palette, Type
} from 'lucide-react';
import {
  aiOptimizationModels, editOptions as editOptionsData, directorPersonas as directorPersonasData, sliderDesc, getSliderText,
} from './categoriesData.js';

const ICONS = { Activity, Star, Smile, Feather, PenTool, Edit2, Box, FastForward, Clapperboard, MessageSquare, Palette, Type };
const withIcon = (item, cls) => {
  const Icon = ICONS[item.iconKey];
  return Icon ? { ...item, icon: <Icon className={cls} /> } : item;
};

export { aiOptimizationModels, sliderDesc, getSliderText };
export const editOptions = { ...editOptionsData, categories: editOptionsData.categories.map((c) => withIcon(c, "w-3.5 h-3.5")) };
export const directorPersonas = directorPersonasData.map((p) => withIcon(p, "w-4 h-4"));

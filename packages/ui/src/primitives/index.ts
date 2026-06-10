// primitives — das Design-System von Buildlab (DESIGN.md §4).
// Jede interaktive Fläche der App baut auf diesen Bausteinen auf;
// ad-hoc nachgebaute Buttons/Karten/Radiogroups sind nicht erlaubt.

export { focusRing, hitArea, useFocusReturn, useFocusTrap } from './focus';
export { Button, buttonClass, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, cardClass, type CardProps, type CardLevel } from './Card';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { Skeleton, ScreenSkeleton, type SkeletonLayout } from './Skeleton';
export { Dialog, type DialogProps } from './Dialog';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './SegmentedControl';
export { StatusBadge, type StatusBadgeProps, type BadgeTone } from './StatusBadge';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';
export { Collapse, type CollapseProps } from './Collapse';
export { useAnnounce } from './announce';
export { reducedMotionActive } from './motion';

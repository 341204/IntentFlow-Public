<template>
  <component
    :is="icons[name] || icons.message"
    :size="size"
    :stroke-width="1.7"
    aria-hidden="true"
  />
</template>
<script setup>
import {
  Workflow,
  Plus,
  MessageSquare,
  Settings2,
  X,
  ArrowUp,
  Copy,
  RotateCcw,
  Check,
  CircleCheck,
  GitPullRequestArrow,
  BookOpen,
  FileText,
  Upload,
  Activity,
  PanelLeft,
  SquarePen,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  ExternalLink,
  Pencil,
} from "lucide-vue-next";
defineProps({ name: String, size: { type: Number, default: 16 } });
const icons = {
  workflow: Workflow,
  plus: Plus,
  message: MessageSquare,
  settings: Settings2,
  x: X,
  send: ArrowUp,
  copy: Copy,
  retry: RotateCcw,
  check: Check,
  complete: CircleCheck,
  route: GitPullRequestArrow,
  book: BookOpen,
  file: FileText,
  upload: Upload,
  activity: Activity,
  sidebar: PanelLeft,
  edit: SquarePen,
  chevron: ChevronRight,
  loading: LoaderCircle,
  error: AlertCircle,
  external: ExternalLink,
  pencil: Pencil,
};
</script>

import { tagColors } from "@/app/constants/pcd";

export const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
};

// Chart extension Remover
export const getFilenameWithoutExtension = (url: string): string => {
  const filename = url?.split("/").pop() || "";
  return filename.replace(/\.[^/.]+$/, "");
};

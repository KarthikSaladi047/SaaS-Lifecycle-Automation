"use client";
import React, { useCallback } from "react";
import { getTagColor } from "./utils";
import { GroupedData } from "@/app/types/pcd";

type TagManagerProps = {
  tags: string[];
  fqdn: string;
  tagInputValue: string;
  setTagInputValue: (val: string) => void;
  environment: string;
  setToastMessage: (msg: string) => void;
  setLocalData: React.Dispatch<React.SetStateAction<GroupedData[]>>;
};

const TagManager: React.FC<TagManagerProps> = ({
  tags,
  fqdn,
  tagInputValue,
  setTagInputValue,
  environment,
  setToastMessage,
  setLocalData,
}) => {
  const updateRegionTags = useCallback(
    (fqdn: string, tags: string[]) => {
      setLocalData((prev) =>
        prev.map((group) => ({
          ...group,
          regions: group.regions.map((region) =>
            region.fqdn === fqdn
              ? {
                  ...region,
                  tags: tags.join(","),
                }
              : region
          ),
        }))
      );
    },
    [setLocalData]
  );

  const handleTagChange = async (
    fqdn: string,
    tag: string,
    endpoint: string,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment, fqdn, tag }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      updateRegionTags(fqdn, data.tags || []);
      setToastMessage(successMessage);
    } catch {
      setToastMessage(errorMessage);
    }
  };

  const handleAddTag = (fqdn: string, newTag: string) => {
    const cleanTag = newTag.trim();
    if (cleanTag) {
      handleTagChange(
        fqdn,
        cleanTag,
        "/api/addTag",
        "Tag added successfully",
        "Failed to add tag"
      );
    }
  };

  const handleRemoveTag = (fqdn: string, tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag) {
      handleTagChange(
        fqdn,
        cleanTag,
        "/api/removeTag",
        "Tag removed",
        "Failed to remove tag"
      );
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`${getTagColor(
              tag
            )} px-2 py-0.5 rounded-full text-xs flex items-center`}
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(fqdn, tag)}
              className="ml-1 text-red-500 hover:text-red-700 text-xs"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={tagInputValue}
        onChange={(e) => setTagInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const newTag = tagInputValue.trim();
            if (newTag) {
              handleAddTag(fqdn, newTag);
              setTagInputValue("");
            }
          }
        }}
        placeholder="Add tag & Enter"
        className="mt-1 text-xs w-full px-2 py-1"
      />
    </div>
  );
};

export default TagManager;

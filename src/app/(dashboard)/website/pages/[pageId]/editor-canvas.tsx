"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus, GripVertical, Trash2, Copy, Eye, EyeOff } from "lucide-react"
import { createBlock, deleteBlock, reorderBlocks, duplicateBlock, toggleBlockVisibility } from "@/lib/actions/pages"
import { BlockRenderer } from "./blocks/block-renderer"
import type { PageBlock, BlockType } from "@/lib/db/schema"

interface EditorCanvasProps {
  pageId: string
  blocks: PageBlock[]
  selectedBlockId: string | null
  onBlockSelect: (blockId: string | null) => void
  onBlocksUpdate: (blocks: PageBlock[]) => void
  onBlockAdd: (block: PageBlock) => void
  onBlockDelete: (blockId: string) => void
}

export function EditorCanvas({
  pageId,
  blocks,
  selectedBlockId,
  onBlockSelect,
  onBlocksUpdate,
  onBlockAdd,
  onBlockDelete,
}: EditorCanvasProps) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [isAddingBlock, setIsAddingBlock] = useState(false)

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropTargetIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedBlockId && dropTargetIndex !== null) {
      const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId)
      if (draggedIndex !== dropTargetIndex && draggedIndex !== dropTargetIndex - 1) {
        const newBlocks = [...blocks]
        const [removed] = newBlocks.splice(draggedIndex, 1)
        const insertIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex
        newBlocks.splice(insertIndex, 0, removed)
        onBlocksUpdate(newBlocks)
        await reorderBlocks(pageId, newBlocks.map((b) => b.id))
      }
    }
    setDraggedBlockId(null)
    setDropTargetIndex(null)
  }

  const handleDeleteBlock = async (blockId: string) => {
    await deleteBlock(blockId)
    onBlockDelete(blockId)
  }

  const handleDuplicateBlock = async (blockId: string) => {
    const newBlock = await duplicateBlock(blockId)
    onBlockAdd(newBlock)
  }

  const handleToggleVisibility = async (blockId: string) => {
    const updatedBlock = await toggleBlockVisibility(blockId)
    onBlocksUpdate(
      blocks.map((b) => (b.id === blockId ? updatedBlock : b))
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-lg border bg-background shadow-sm">
        {/* Drop zone at top */}
        <div
          className={cn(
            "h-2 transition-all",
            dropTargetIndex === 0 && draggedBlockId && "h-16 bg-primary/10 border-2 border-dashed border-primary rounded-t-lg"
          )}
          onDragOver={(e) => handleDragOver(e, 0)}
        />

        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Start building your page</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Add blocks from the sidebar to create your page content.
            </p>
          </div>
        ) : (
          blocks.map((block, index) => (
            <div key={block.id}>
              <div
                className={cn(
                  "group relative",
                  selectedBlockId === block.id && "ring-2 ring-primary ring-offset-2",
                  !block.isVisible && "opacity-50",
                  draggedBlockId === block.id && "opacity-50"
                )}
                onClick={() => onBlockSelect(block.id)}
                draggable
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
              >
                {/* Block Toolbar */}
                <div
                  className={cn(
                    "absolute -left-12 top-0 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                    selectedBlockId === block.id && "opacity-100"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className={cn(
                    "absolute -right-12 top-0 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                    selectedBlockId === block.id && "opacity-100"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleVisibility(block.id)
                    }}
                  >
                    {block.isVisible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicateBlock(block.id)
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBlock(block.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Block Content */}
                <BlockRenderer block={block} isEditing />
              </div>

              {/* Drop zone after block */}
              <div
                className={cn(
                  "h-2 transition-all",
                  dropTargetIndex === index + 1 && draggedBlockId && draggedBlockId !== block.id &&
                  "h-16 bg-primary/10 border-2 border-dashed border-primary"
                )}
                onDragOver={(e) => handleDragOver(e, index + 1)}
              />
            </div>
          ))
        )}

        {/* Add Block Button */}
        <div className="flex justify-center p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onBlockSelect(null)}
          >
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </div>
      </div>
    </div>
  )
}

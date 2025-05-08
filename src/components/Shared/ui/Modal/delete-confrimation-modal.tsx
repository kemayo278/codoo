'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/Shared/ui/alert-dialog"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  isLoading? : boolean,
  title: string;
  description: string;
  onClose: () => void
  onConfirm: (e:React.FormEvent) => void
}

export function DeleteConfirmationModal({
  isOpen,
  isLoading,
  title,
  description,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected order(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={isLoading ? (() => null) : onConfirm}>
            {isLoading ? ( <ButtonSpinner/> ) : ( "Delete" )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
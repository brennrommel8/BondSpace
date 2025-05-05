import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { DEFAULT_AVATAR } from "@/utils/profileImageUtils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  src,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  // Use state to track image loading errors
  const [imgSrc, setImgSrc] = React.useState(src || DEFAULT_AVATAR)

  // Update imgSrc when src prop changes
  React.useEffect(() => {
    setImgSrc(src || DEFAULT_AVATAR)
  }, [src])

  // Handle image loading errors
  const handleError = () => {
    // If image fails to load, use default avatar
    setImgSrc(DEFAULT_AVATAR)
  }

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      src={imgSrc}
      onError={handleError}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

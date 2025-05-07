import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"
import { getProfileImageUrl } from "@/utils/profileImageUtils"

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

interface AvatarImageProps extends React.ComponentProps<typeof AvatarPrimitive.Image> {
  username?: string;
}

function AvatarImage({
  className,
  src,
  username,
  ...props
}: AvatarImageProps) {
  // Use state to track image loading errors
  const [imgSrc, setImgSrc] = React.useState<string>(() => getProfileImageUrl(src, username))

  // Update imgSrc when src prop changes
  React.useEffect(() => {
    setImgSrc(getProfileImageUrl(src, username))
  }, [src, username])

  // Handle image loading errors
  const handleError = () => {
    // If image fails to load, use default avatar with username
    setImgSrc(getProfileImageUrl(null, username))
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
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

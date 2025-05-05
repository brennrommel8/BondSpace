import { Button } from "@/components/ui/button"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface SuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
  buttonText?: string
  animationPath?: string
}

export const SuccessDialog = ({
  isOpen,
  onClose,
  title = "Success!",
  message = "Your account has been created successfully.",
  buttonText = "Continue",
  animationPath = "/animations/success.json"
}: SuccessDialogProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-40 h-40 mb-4">
            <DotLottieReact
              src={animationPath}
              loop={false}
              autoplay={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <h2 className="text-xl font-semibold text-emerald-900 mb-2">{title}</h2>
          <p className="text-sm text-emerald-700 text-center mb-6">{message}</p>
          <Button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
} 
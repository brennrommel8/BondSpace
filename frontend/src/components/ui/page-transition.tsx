import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
  direction?: "left" | "right"
}

export const PageTransition = ({ children, direction = "right" }: PageTransitionProps) => {
  const pageVariants = {
    initial: {
      x: direction === "right" ? "100%" : "-100%",
      opacity: 0,
      scale: 0.95
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        mass: 0.8,
        restDelta: 0.001
      }
    },
    exit: {
      x: direction === "right" ? "-100%" : "100%",
      opacity: 0,
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15,
        mass: 0.8,
        restDelta: 0.001
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
} 
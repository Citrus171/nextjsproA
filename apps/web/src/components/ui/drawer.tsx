import * as React from "react";
import { Drawer as VaulDrawer } from "vaul";
import { cn } from "../../lib/utils";

const DrawerRoot = VaulDrawer.Root;
const DrawerTrigger = VaulDrawer.Trigger;
const DrawerPortal = VaulDrawer.Portal;
const DrawerClose = VaulDrawer.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Overlay>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Overlay>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Overlay
    className={cn("fixed inset-0 bg-black/60", className)}
    {...props}
    ref={ref}
  />
));
DrawerOverlay.displayName = VaulDrawer.Overlay.displayName;

interface DrawerContentProps extends React.ComponentPropsWithoutRef<
  typeof VaulDrawer.Content
> {
  children?: React.ReactNode;
  className?: string;
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Content>,
  DrawerContentProps
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <VaulDrawer.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 bg-white rounded-t-[2rem] shadow-xl flex flex-col",
        className
      )}
      {...props}
    >
      {children}
    </VaulDrawer.Content>
  </DrawerPortal>
));
DrawerContent.displayName = VaulDrawer.Content.displayName;

const DrawerHandle = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Handle>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Handle>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Handle
    ref={ref}
    className={cn(
      "w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 shrink-0",
      className
    )}
    {...props}
  />
));
DrawerHandle.displayName = VaulDrawer.Handle.displayName;

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Title>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Title>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Title
    ref={ref}
    className={cn("text-lg font-semibold text-slate-900", className)}
    {...props}
  />
));
DrawerTitle.displayName = VaulDrawer.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof VaulDrawer.Description>,
  React.ComponentPropsWithoutRef<typeof VaulDrawer.Description>
>(({ className, ...props }, ref) => (
  <VaulDrawer.Description
    ref={ref}
    className={cn("text-sm text-slate-500", className)}
    {...props}
  />
));
DrawerDescription.displayName = VaulDrawer.Description.displayName;

export {
  DrawerRoot,
  DrawerTrigger,
  DrawerContent,
  DrawerOverlay,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerPortal,
};

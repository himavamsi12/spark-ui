"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

const DEFAULT_ITEMS = ["Work", "Manifesto", "Contact"];

/** The reference's rem constants, resolved against a 16px root. */
const REM = 16;
const DRAWER_GAP = 0.35 * REM;
const DRAWER_PADDING = 0.35 * REM;

/**
 * A floating pill menu you can pick up and throw around the frame. The toggle
 * grows the item tray open from nothing, and dragging raises a dashed outline
 * over the spot it came from that snaps it back if you let go near enough.
 */
export default function DraggablePillMenu({
  logo = "/access-gate/logo-dark.png",
  items = DEFAULT_ITEMS,
  background = "#ffffff",
  drawerColor = "#e8e6e7",
  itemColor = "#fafafa",
  togglerColor = "#d3d2d2",
  textColor = "#0f0f0f",
  snapThreshold = 200,
  fontFamily = "var(--font-plus-jakarta-sans), sans-serif",
  textScale = 100,
  speed = 100,
}: {
  logo?: string;
  /** One pill per entry, revealed as the tray opens. */
  items?: string[];
  background?: string;
  /** The pill the whole menu sits in. */
  drawerColor?: string;
  itemColor?: string;
  togglerColor?: string;
  textColor?: string;
  /** How near its home the menu has to be dropped to snap back, in px. */
  snapThreshold?: number;
  fontFamily?: string;
  textScale?: number;
  speed?: number;
}) {
  const scale = textScale / 100;
  const rootRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const togglerRef = useRef<HTMLDivElement>(null);
  const itemElRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [open, setOpen] = useState(false);
  // The click handler lives on a ref so the Draggable rig below can stay
  // mounted once while still reading the current open state.
  const openRef = useRef(false);
  const toggleRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const dropZone = dropZoneRef.current;
    const drawer = drawerRef.current;
    const menuLogo = logoRef.current;
    const menuItems = itemsRef.current;
    const toggler = togglerRef.current;
    const itemEls = itemElRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!root || !dropZone || !drawer || !menuLogo || !menuItems || !toggler) return;

    const rate = Math.max(0.2, speed / 100);

    // Measured before the tray is collapsed, as the reference does — but the
    // inline width is cleared first. The reference only ever runs once; this
    // effect re-runs (StrictMode's double mount, or a prop change), and a
    // second pass would otherwise measure the tray it had already collapsed
    // to zero and animate "open" to a width of nothing.
    gsap.set(menuItems, { clearProps: "width,marginRight" });
    const menuItemsFullWidth = menuItems.offsetWidth;
    const logoWidth = menuLogo.offsetWidth;
    const togglerWidth = toggler.offsetWidth;

    const closedMenuWidth = DRAWER_PADDING + logoWidth + DRAWER_GAP + togglerWidth + DRAWER_PADDING;
    const openMenuWidth =
      DRAWER_PADDING +
      logoWidth +
      DRAWER_GAP +
      menuItemsFullWidth +
      DRAWER_GAP +
      togglerWidth +
      DRAWER_PADDING;

    gsap.set(menuItems, { width: 0, marginRight: 0 });
    gsap.set(itemEls, { opacity: 0, scale: 0.85 });
    gsap.set(dropZone, { width: closedMenuWidth });
    // The tray is collapsed above, so the toggle has to agree with it.
    openRef.current = false;
    setOpen(false);

    function openMenu() {
      gsap.to(menuItems, {
        width: menuItemsFullWidth,
        marginRight: DRAWER_GAP,
        duration: 0.5 / rate,
        ease: "power3.inOut",
        onStart: () => {
          gsap.to(itemEls, {
            opacity: 1,
            scale: 1,
            duration: 0.3 / rate,
            stagger: 0.05 / rate,
            delay: 0.2 / rate,
            ease: "power3.out",
          });
        },
      });
    }

    function closeMenu() {
      gsap.to(menuItems, {
        width: 0,
        marginRight: 0,
        duration: 0.5 / rate,
        ease: "power3.inOut",
        onStart: () => {
          gsap.to(itemEls, {
            opacity: 0,
            scale: 0.85,
            duration: 0.3 / rate,
            ease: "power3.out",
            stagger: { each: 0.05 / rate, from: "end" },
          });
        },
      });
    }

    toggleRef.current = () => {
      if (openRef.current) closeMenu();
      else openMenu();
      openRef.current = !openRef.current;
      setOpen(openRef.current);
    };

    const [instance] = Draggable.create(drawer, {
      type: "x,y",
      // The reference bounds to the window; here the frame is the component.
      bounds: root,
      cursor: "grab",
      activeCursor: "grabbing",

      onDragStart() {
        gsap.set(dropZone, { width: openRef.current ? openMenuWidth : closedMenuWidth });
      },

      onDrag(this: Draggable) {
        const within = Math.abs(this.x) < snapThreshold && Math.abs(this.y) < snapThreshold;
        gsap.to(dropZone, { opacity: within ? 1 : 0, duration: 0.1 });
      },

      onDragEnd(this: Draggable) {
        gsap.to(dropZone, { opacity: 0, duration: 0.1 });
        const within = Math.abs(this.x) < snapThreshold && Math.abs(this.y) < snapThreshold;
        if (within) {
          gsap.to(drawer, { x: 0, y: 0, duration: 0.3 / rate, ease: "power2.out" });
        }
      },
    });

    return () => {
      instance?.kill();
      gsap.killTweensOf([menuItems, dropZone, drawer, ...itemEls]);
      toggleRef.current = () => {};
    };
  }, [items, speed, snapThreshold]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background, fontFamily, color: textColor }}
    >
      {/* The outline left behind at the menu's home position, raised only
          while the menu is being dragged near enough to snap back to it. */}
      <div
        ref={dropZoneRef}
        className="pointer-events-none absolute rounded-[4rem] opacity-0"
        style={{
          top: "2rem",
          left: "2rem",
          height: "calc(3.5rem + 0.7rem)",
          border: "0.075rem dashed rgba(0, 0, 0, 0.5)",
          // Both the reference's CSS transition and its 0.1s GSAP tween act on
          // opacity: GSAP writes a value every frame and this smooths each
          // write, so the outline trails in and out rather than snapping.
          transition: "opacity 0.2s ease-out",
        }}
      />

      <div
        ref={drawerRef}
        className="absolute flex items-center rounded-[4rem]"
        style={{ top: "2rem", left: "2rem", padding: "0.35rem", background: drawerColor }}
      >
        <div
          ref={logoRef}
          className="flex shrink-0 items-center justify-center rounded-[4rem]"
          style={{ width: "6rem", height: "3.5rem", paddingLeft: "0.5rem" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" style={{ width: "3.5rem" }} draggable={false} />
        </div>

        <div ref={itemsRef} className="flex" style={{ gap: "0.35rem" }}>
          {items.map((label, i) => (
            <div
              key={`${label}-${i}`}
              ref={(el) => {
                itemElRefs.current[i] = el;
              }}
              className="flex shrink-0 items-center justify-center rounded-[4rem] opacity-0"
              style={{ width: "max-content", height: "3.5rem", background: itemColor }}
            >
              <span
                className="select-none whitespace-nowrap"
                style={{
                  color: textColor,
                  fontWeight: 450,
                  letterSpacing: "-0.01rem",
                  padding: "0 1.5rem",
                  fontSize: `calc(1rem * ${scale})`,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          ref={togglerRef}
          onClick={() => toggleRef.current()}
          role="button"
          tabIndex={0}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleRef.current();
            }
          }}
          className="relative flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-[4rem]"
          style={{
            width: "3.5rem",
            height: "3.5rem",
            padding: "1.125rem",
            gap: "0.2rem",
            background: togglerColor,
          }}
        >
          {[0, 1].map((k) => (
            <span
              key={k}
              className="relative w-full will-change-transform"
              style={{
                height: "0.125rem",
                background: textColor,
                transformOrigin: "center",
                transition: "transform 0.3s ease",
                transform: open
                  ? k === 0
                    ? "rotate(45deg) translateX(0.125rem) translateY(0.1rem) scaleX(0.9)"
                    : "rotate(-45deg) translateX(0.125rem) translateY(-0.1rem) scaleX(0.9)"
                  : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

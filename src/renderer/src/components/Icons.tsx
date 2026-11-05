import type { ReactElement, ReactNode, SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function Svg({ size = 18, children, ...rest }: IconProps & { children: ReactNode }): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Play = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </Svg>
)
export const Pause = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Previous = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M18 5.5v13L8.5 12z" fill="currentColor" stroke="none" />
    <rect x="4.5" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Next = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M6 5.5v13L15.5 12z" fill="currentColor" stroke="none" />
    <rect x="17.1" y="5" width="2.4" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Stop = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.6" fill="currentColor" stroke="none" />
  </Svg>
)
export const Volume = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
    <path d="M15.6 8.6a5 5 0 0 1 0 6.8" />
    <path d="M18.2 6a8.6 8.6 0 0 1 0 12" />
  </Svg>
)
export const VolumeOff = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
    <path d="m16 9.5 5 5" />
    <path d="m21 9.5-5 5" />
  </Svg>
)
export const Maximize = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 9V4h5" />
    <path d="M20 15v5h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 9V4h-5" />
  </Svg>
)
export const FullscreenExit = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M9 4v5H4" />
    <path d="M15 20v-5h5" />
    <path d="M15 4v5h5" />
    <path d="M9 20v-5H4" />
  </Svg>
)
export const MinimizeWindow = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)
export const MaximizeWindow = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </Svg>
)
export const RestoreWindow = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  </Svg>
)
export const Close = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m6 6 12 12" />
    <path d="M18 6 6 18" />
  </Svg>
)
export const Folder = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.5h7.5A2.5 2.5 0 0 1 21 10v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17z" />
  </Svg>
)
export const FilePlus = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 11v6" />
    <path d="M9 14h6" />
  </Svg>
)
export const Settings = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.1.3.3.6.6 1 .3.3.7.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6z" />
  </Svg>
)
export const Scissors = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.5 15.5" />
    <path d="M8.5 8.5 20 20" />
  </Svg>
)
export const Film = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </Svg>
)
export const Convert = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 8a8 8 0 0 1 13.2-2.8L20 8" />
    <path d="M20 4v4h-4" />
    <path d="M20 16a8 8 0 0 1-13.2 2.8L4 16" />
    <path d="M4 20v-4h4" />
  </Svg>
)
export const Layers = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 16 9 5 9-5" />
  </Svg>
)
export const Info = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)
export const Camera = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.4" />
  </Svg>
)
export const List = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Search = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </Svg>
)
export const Trash = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4.5h6V7" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </Svg>
)
export const Plus = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const ChevronDown = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
export const ChevronUp = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
)
export const ChevronLeft = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)
export const ChevronRight = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
export const Sun = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </Svg>
)
export const Moon = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Svg>
)
export const Pin = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M10 4h4l-.5 5 3.5 3.5V15h-4v6l-1 .5-1-.5v-6H7v-2.5L10.5 9z" />
  </Svg>
)
export const Mini = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="12" y="12" width="6" height="4.5" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Subtitles = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M6.5 12h4M13.5 12h4M6.5 15.5h11" />
  </Svg>
)
export const Repeat = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11V9a3 3 0 0 1 3-3h13" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 13v2a3 3 0 0 1-3 3H4" />
  </Svg>
)
export const RepeatOne = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M17 3l3 3-3 3" />
    <path d="M4 11V9a3 3 0 0 1 3-3h13" />
    <path d="M7 21l-3-3 3-3" />
    <path d="M20 13v2a3 3 0 0 1-3 3H4" />
    <path d="M11 10.5 12.5 9.5V15" />
  </Svg>
)
export const Shuffle = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 6h3c3.5 0 6.5 12 10 12h3" />
    <path d="m17 15 3 3-3 3" />
    <path d="M4 18h3c1.2 0 2.3-1.3 3.4-3" />
    <path d="M13.6 9C14.7 7.3 15.8 6 17 6h3" />
    <path d="m17 3 3 3-3 3" />
  </Svg>
)
export const Rotate = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M20 8V4l-2.2 2.2A8 8 0 1 0 20 12" />
  </Svg>
)
export const ZoomIn = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4M11 8v6M8 11h6" />
  </Svg>
)
export const ZoomOut = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4M8 11h6" />
  </Svg>
)
export const Check = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
)
export const CheckCircle = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.7 2.7L16 9.5" />
  </Svg>
)
export const Loader = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Svg>
)
export const Music = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </Svg>
)
export const Video = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="m16 10 5-3v10l-5-3z" />
  </Svg>
)
export const Image = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9" r="1.5" />
    <path d="m4 17 5-5 3.5 3.5L16 12l4 4" />
  </Svg>
)
export const External = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
  </Svg>
)
export const Clock = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
)
export const Gauge = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4.5 18a8.5 8.5 0 1 1 15 0" />
    <path d="m12 14 3.5-4" />
    <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)
export const ArrowUp = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)
export const ArrowDown = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)
export const Sparkles = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </Svg>
)
export const Download = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="m7.5 11 4.5 4.5 4.5-4.5" />
    <path d="M5 19h14" />
  </Svg>
)
export const Save = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M8 3v6h8V3M8 21v-7h8v7" />
  </Svg>
)
export const Eye = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const Monitor = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Svg>
)
export const Gif = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <text x="12" y="15" textAnchor="middle" fontSize="6.6" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
      GIF
    </text>
  </Svg>
)
export const Crop = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M2 6h14a2 2 0 0 1 2 2v14" />
  </Svg>
)
export const Palette = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .9-1.8 2-1.8h1.5A4.5 4.5 0 0 0 21 10c0-4-4-7-9-7z" />
    <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)
export const Database = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="3" />
    <path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    <path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </Svg>
)
export const Alert = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)
export const Keyboard = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M18 13h.01M9 13h6M7 16h10" />
  </Svg>
)
export const X = Close
export const FolderOpen = Folder
export const Link = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M10 14a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
    <path d="M14 10a5 5 0 0 0-7.07 0l-3.54 3.54a5 5 0 0 0 7.07 7.07l1.72-1.72" />
  </Svg>
)
export const Globe = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a13.5 13.5 0 0 1 3.6 9 13.5 13.5 0 0 1-3.6 9 13.5 13.5 0 0 1-3.6-9A13.5 13.5 0 0 1 12 3z" />
  </Svg>
)
export const Rewind = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M11 17V7l-7 5z" fill="currentColor" stroke="none" />
    <path d="M20 17V7l-7 5z" fill="currentColor" stroke="none" />
  </Svg>
)
export const Forward = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M4 7v10l7-5z" fill="currentColor" stroke="none" />
    <path d="M13 7v10l7-5z" fill="currentColor" stroke="none" />
  </Svg>
)
export const StepBack = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
    <path d="M9 6H7v12h2" />
  </Svg>
)
export const StepForward = (p: IconProps): ReactElement => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
    <path d="M15 6h2v12h-2" />
  </Svg>
)

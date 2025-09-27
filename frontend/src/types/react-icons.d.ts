declare module 'react-icons' {
  import { ComponentType, CSSProperties } from 'react';
  export interface IconBaseProps {
    size?: string | number;
    color?: string;
    className?: string;
    style?: CSSProperties;
  }
  export interface IconProps extends IconBaseProps {
    children?: never;
  }
  export type IconType = ComponentType<IconProps>;
  export const IconContext: ComponentType;
  export const IconContextProvider: ComponentType;
}

declare module 'react-icons/md' {
  import { IconType } from 'react-icons';
  export const MdHome: IconType;
  export const MdSearch: IconType;
  export const MdAdd: IconType;
  export const MdMovie: IconType;
  export const MdPerson: IconType;
  export const MdSend: IconType;
  export const MdMoreVert: IconType;
  export const MdEmojiEmotions: IconType;
  export const MdAttachFile: IconType;
  export const MdImage: IconType;
  export const MdLock: IconType;
  export const MdVisibility: IconType;
  export const MdVisibilityOff: IconType;
  export const MdArrowBack: IconType;
  export const MdCheckCircle: IconType;
  export const MdFavorite: IconType;
  export const MdFavoriteBorder: IconType;
  export const MdChat: IconType;
  export const MdShare: IconType;
  export const MdBookmarkBorder: IconType;
  export const MdVolumeUp: IconType;
  export const MdVolumeOff: IconType;
  export const MdPlayArrow: IconType;
  export const MdClose: IconType;
  export const MdSignalWifi4Bar: IconType;
  export const MdSignalWifiOff: IconType;
  export const MdSync: IconType;
  export const MdSyncProblem: IconType;
}

declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  export const FaArrowLeft: IconType;
  export const FaBell: IconType;
  export const FaChartLine: IconType;
  export const FaCheckCircle: IconType;
  export const FaChevronLeft: IconType;
  export const FaChevronRight: IconType;
  export const FaCog: IconType;
  export const FaComment: IconType;
  export const FaCompass: IconType;
  export const FaEdit: IconType;
  export const FaEllipsisV: IconType;
  export const FaEnvelope: IconType;
  export const FaExclamationTriangle: IconType;
  export const FaEye: IconType;
  export const FaEyeSlash: IconType;
  export const FaGraduationCap: IconType;
  export const FaHeartbeat: IconType;
  export const FaHeart: IconType;
  export const FaHome: IconType;
  export const FaImage: IconType;
  export const FaImages: IconType;
  export const FaLeaf: IconType;
  export const FaLock: IconType;
  export const FaMapMarkerAlt: IconType;
  export const FaPaperPlane: IconType;
  export const FaPlus: IconType;
  export const FaRegBookmark: IconType;
  export const FaRegHeart: IconType;
  export const FaSearch: IconType;
  export const FaShare: IconType;
  export const FaSignOutAlt: IconType;
  export const FaSync: IconType;
  export const FaTimes: IconType;
  export const FaTint: IconType;
  export const FaUser: IconType;
  export const FaUserPlus: IconType;
  export const FaUsers: IconType;
  export const FaVideo: IconType;
}

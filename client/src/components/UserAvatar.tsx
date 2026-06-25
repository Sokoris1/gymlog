type Props = {
  name?: string | null;
  avatar?: string | null;
  containerClassName: string;
  fallbackClassName?: string;
};

export function UserAvatar({ name, avatar, containerClassName, fallbackClassName = "" }: Props) {
  if (avatar) {
    return (
      <div className={`${containerClassName} overflow-hidden`}>
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${containerClassName} ${fallbackClassName} flex items-center justify-center font-bold`}>
      {name?.charAt(0)?.toUpperCase() ?? "?"}
    </div>
  );
}

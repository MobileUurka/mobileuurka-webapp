type Props = {
  isActive: boolean;
};

const Overlay = ({ isActive }: Props) => {
  return (
    <div className={`absolute top-0 w-[50%] h-full bg-gray-200 transition-all duration-500 ease-in-out z-9999 ${isActive ? 'left-[50%]' : 'left-0'}`}>
      {isActive ? 'Overlay is ON' : 'Overlay is OFF'}
    </div>
  )
}

export default Overlay
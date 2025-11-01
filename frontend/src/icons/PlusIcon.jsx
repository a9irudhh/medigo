const PlusIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* vertical line */}
    <path d="M12 5v14" />
    {/* horizontal line */}
    <path d="M5 12h14" />
  </svg>
);

export default PlusIcon;

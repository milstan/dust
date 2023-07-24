import * as React from "react";
import type { SVGProps } from "react";
const SvgBeakerPlus = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="m15.97 9.04 5.95 7.35h.01c.58.72.86 1.62.75 2.48-.11.88-.63 1.67-1.54 2.11-.98.47-2.22.71-3.71.85-1.49.14-3.31.17-5.45.17s-3.95-.03-5.45-.17c-1.49-.13-2.73-.38-3.71-.85-.91-.44-1.43-1.23-1.54-2.11-.11-.86.17-1.76.75-2.48l5.94-7.35c.32-.41.5-.9.5-1.42V3.69l-.38.05c-.4.07-.79-.21-.86-.62-.07-.41.21-.79.62-.86.06-.01 1.59-.26 4.12-.26 2.53 0 4.06.25 4.12.26a.75.75 0 0 1-.12 1.49s-.08 0-.12-.01c0 0-.14-.02-.38-.05v3.93c0 .52.18 1.02.5 1.42Zm-4.8 1.965c-.73-.284-1.502-.585-2.237-.782l.197-.243c.54-.67.83-1.5.83-2.36V3.56c.56-.03 1.23-.06 2-.06s1.44.03 2 .06v4.06c0 .86.29 1.69.83 2.36l1.62 2.001c-1.327-.044-2.99-.175-3.91-.481a29.772 29.772 0 0 1-1.33-.495ZM12 13a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 12 13Z"
      clipRule="evenodd"
    />
  </svg>
);
export default SvgBeakerPlus;

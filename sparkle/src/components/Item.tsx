import React, { ComponentType, MouseEvent, ReactNode } from "react";

import {
  noHrefLink,
  SparkleContext,
  SparkleContextLinkType,
} from "@sparkle/context";
import { ChevronRight } from "@sparkle/icons/solid";
import { classNames } from "@sparkle/lib/utils";

import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const activeLabelStyleClasses =
  "group-hover:s-text-action-500 group-active:s-text-action-700 dark:group-hover:s-text-action-600-dark dark:group-active:s-text-action-400-dark";

const labelStyleClasses = {
  item: "s-font-normal",
  action: "s-font-semibold",
};

const labelColorClasses = {
  item: "s-text-element-600 dark:s-text-element-500-dark",
  action: "s-text-element-800 dark:s-text-element-800-dark",
};

const spacingClasses = {
  sm: "s-py-2 s-gap-x-2",
  md: "s-py-2.5 s-gap-x-3",
};

type ItemProps = {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  style: "action" | "item";
  spacing?: "sm" | "md";
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  visual?: string | React.ReactNode;
  icon?: ComponentType;
  action?: ComponentType;
  hasAction?: boolean | "hover";
  className?: string;
  href?: string;
};

export function Item({
  label,
  description,
  visual,
  icon,
  style = "action",
  spacing = "sm",
  action = ChevronRight,
  hasAction = true,
  onClick,
  selected = false,
  disabled = false,
  className = "",
  href,
}: ItemProps) {
  const { components } = React.useContext(SparkleContext);

  const Link: SparkleContextLinkType = href ? components.link : noHrefLink;

  let visualElement: React.ReactNode;

  if (visual) {
    visualElement = (
      <Avatar
        size={description ? "sm" : "xs"}
        visual={visual}
        disabled={disabled}
        clickable
      />
    );
  } else if (icon) {
    visualElement = (
      <Icon
        visual={icon}
        className={classNames(
          "s-transition-colors s-duration-200 s-ease-out",
          disabled
            ? "s-text-element-500 dark:s-text-element-500-dark"
            : selected
            ? "s-text-action-400 dark:s-text-action-600-dark"
            : "s-text-element-600 group-hover:s-text-action-400 group-active:s-text-action-700 dark:group-hover:s-text-action-600-dark dark:group-active:s-text-action-400-dark"
        )}
      />
    );
  }

  return (
    <Link
      className={classNames(
        "s-duration-400 s-group s-box-border s-flex s-select-none s-text-sm s-transition-colors s-ease-out",
        spacingClasses[spacing],
        disabled ? "" : "s-cursor-pointer",
        className
      )}
      onClick={selected || disabled ? undefined : onClick}
      aria-label={label}
      href={href || "#"}
    >
      {visualElement}
      <div
        className={classNames(
          "s-flex s-grow s-flex-col s-gap-0 s-overflow-hidden"
        )}
      >
        <div
          className={classNames(
            "s-transition-colors s-duration-200 s-ease-out",
            "s-grow s-truncate s-text-sm",
            labelStyleClasses[style],
            disabled
              ? "s-text-element-600 dark:s-text-element-500-dark"
              : selected
              ? "s-text-action-500 dark:s-text-action-600-dark"
              : classNames(labelColorClasses[style], activeLabelStyleClasses)
          )}
        >
          {label}
        </div>
        <div
          className={classNames(
            "s-grow s-truncate s-text-xs",
            disabled
              ? "s-text-element-600 dark:s-text-element-500-dark"
              : "s-text-element-700 dark:s-text-element-600-dark"
          )}
        >
          {description}
        </div>
      </div>

      <Icon
        visual={action}
        className={
          hasAction
            ? classNames(
                "s-shrink-0 s-transition-all s-duration-200 s-ease-out",
                hasAction === "hover"
                  ? "s-opacity-0 group-hover:s-opacity-100 "
                  : "",
                disabled
                  ? "s-text-element-500 dark:s-text-element-500-dark"
                  : selected
                  ? "s-text-action-400 s-opacity-100 dark:s-text-action-600-dark"
                  : classNames(
                      "s-text-element-600 group-hover:s-text-action-400 group-active:s-text-action-700 dark:group-hover:s-text-action-600-dark dark:group-active:s-text-action-400-dark",
                      hasAction ? "group-hover:s-opacity-100" : ""
                    )
              )
            : "s-hidden"
        }
        size="sm"
      />
    </Link>
  );
}

interface EntryItemProps {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
  selected?: boolean;
  label: string;
  icon?: ComponentType;
  className?: string;
  href?: string;
}

Item.Entry = function (props: EntryItemProps) {
  return <Item {...props} spacing="sm" style="item" hasAction={"hover"} />;
};

interface AvatarItemProps {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  visual?: string | React.ReactNode;
  className?: string;
  hasAction?: boolean | "hover";
  href?: string;
}

Item.Avatar = function ({
  description,
  hasAction = false,
  ...otherProps
}: AvatarItemProps) {
  return (
    <Item
      {...otherProps}
      style="action"
      spacing={description ? "md" : "sm"}
      description={description}
      hasAction={hasAction}
    />
  );
};

interface NavigationListItemProps {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  selected?: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  icon?: ComponentType;
  className?: string;
  href?: string;
}

Item.Navigation = function (props: NavigationListItemProps) {
  return <Item {...props} style="action" spacing="md" />;
};

interface DropdownListItemProps {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  visual?: string | React.ReactNode;
  icon?: ComponentType;
  className?: string;
  href?: string;
}

Item.Dropdown = function (props: DropdownListItemProps) {
  return <Item {...props} spacing="md" style="action" hasAction={false} />;
};

interface ListItemProps {
  children: ReactNode;
  className?: string;
}

interface ItemSectionHeaderProps {
  label: string;
  variant?: "primary" | "secondary";
}

Item.SectionHeader = function ({
  label,
  variant = "primary",
}: ItemSectionHeaderProps) {
  return (
    <div
      className={classNames(
        variant === "primary"
          ? "s-text-element-800 dark:s-text-element-800-dark"
          : "s-text-element-600 dark:s-text-element-600-dark",
        "s-pb-2 s-pt-6 s-text-xs s-font-medium s-uppercase"
      )}
    >
      {label}
    </div>
  );
};

Item.List = function ({ children, className }: ListItemProps) {
  return (
    <div className={classNames(className ? className : "", "s-flex")}>
      <div className={"s-flex s-w-full s-flex-col"}>{children}</div>
    </div>
  );
};

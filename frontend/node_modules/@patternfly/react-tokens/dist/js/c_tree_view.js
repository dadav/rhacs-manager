"use strict";
exports.__esModule = true;
exports.c_tree_view = {
  ".pf-v6-c-tree-view": {
    "c_tree_view__node_indent_base": {
      "name": "--pf-v6-c-tree-view__node--indent--base",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_nested_indent_base": {
      "name": "--pf-v6-c-tree-view__node--nested-indent--base",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view__content_BorderRadius": {
      "name": "--pf-v6-c-tree-view__content--BorderRadius",
      "value": "6px",
      "values": [
        "--pf-t--global--border--radius--small",
        "--pf-t--global--border--radius--200",
        "6px"
      ]
    },
    "c_tree_view__node_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_Color": {
      "name": "--pf-v6-c-tree-view__node--Color",
      "value": "#4d4d4d",
      "values": [
        "--pf-t--global--text--color--subtle",
        "--pf-t--global--text--color--200",
        "--pf-t--color--gray--60",
        "#4d4d4d"
      ]
    },
    "c_tree_view__node_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__node--BackgroundColor",
      "value": "transparent"
    },
    "c_tree_view__node_BorderRadius": {
      "name": "--pf-v6-c-tree-view__node--BorderRadius",
      "value": "6px",
      "values": [
        "--pf-v6-c-tree-view__content--BorderRadius",
        "--pf-t--global--border--radius--small",
        "--pf-t--global--border--radius--200",
        "6px"
      ]
    },
    "c_tree_view__node_BorderColor": {
      "name": "--pf-v6-c-tree-view__node--BorderColor",
      "value": "rgba(255, 255, 255, 0.0000)",
      "values": [
        "--pf-t--global--border--color--high-contrast",
        "rgba(255, 255, 255, 0.0000)"
      ]
    },
    "c_tree_view__node_BorderWidth": {
      "name": "--pf-v6-c-tree-view__node--BorderWidth",
      "value": "0px",
      "values": [
        "--pf-t--global--border--width--action--plain--default",
        "0px"
      ]
    },
    "c_tree_view__node_hover_BorderWidth": {
      "name": "--pf-v6-c-tree-view__node--hover--BorderWidth",
      "value": "0px",
      "values": [
        "--pf-t--global--border--width--action--plain--hover",
        "0px"
      ]
    },
    "c_tree_view__node_m_current_BorderWidth": {
      "name": "--pf-v6-c-tree-view__node--m-current--BorderWidth",
      "value": "0px",
      "values": [
        "--pf-t--global--border--width--action--plain--clicked",
        "0px"
      ]
    },
    "c_tree_view__node_m_current_Color": {
      "name": "--pf-v6-c-tree-view__node--m-current--Color",
      "value": "#151515",
      "values": [
        "--pf-t--global--text--color--regular",
        "--pf-t--global--text--color--100",
        "--pf-t--color--gray--95",
        "#151515"
      ]
    },
    "c_tree_view__node_m_current_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__node--m-current--BackgroundColor",
      "value": "#f2f2f2",
      "values": [
        "--pf-t--global--background--color--primary--clicked",
        "--pf-t--global--background--color--200",
        "--pf-t--color--gray--10",
        "#f2f2f2"
      ]
    },
    "c_tree_view__node_hover_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__node--hover--BackgroundColor",
      "value": "#f2f2f2",
      "values": [
        "--pf-t--global--background--color--primary--hover",
        "--pf-t--global--background--color--200",
        "--pf-t--color--gray--10",
        "#f2f2f2"
      ]
    },
    "c_tree_view__node_container_Display": {
      "name": "--pf-v6-c-tree-view__node-container--Display",
      "value": "contents"
    },
    "c_tree_view__node_content_RowGap": {
      "name": "--pf-v6-c-tree-view__node-content--RowGap",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_content_Overflow": {
      "name": "--pf-v6-c-tree-view__node-content--Overflow",
      "value": "visible"
    },
    "c_tree_view__list_TransitionDuration_expand_slide": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--expand--slide",
      "value": "0s"
    },
    "c_tree_view__list_TransitionDuration_expand_fade": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--expand--fade",
      "value": "200ms",
      "values": [
        "--pf-t--global--motion--duration--fade--default",
        "--pf-t--global--motion--duration--md",
        "--pf-t--global--duration--200",
        "200ms"
      ]
    },
    "c_tree_view__list_TransitionDuration_collapse_slide": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--collapse--slide",
      "value": "0s"
    },
    "c_tree_view__list_TransitionDuration_collapse_fade": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--collapse--fade",
      "value": "100ms",
      "values": [
        "--pf-t--global--motion--duration--fade--short",
        "--pf-t--global--motion--duration--sm",
        "--pf-t--global--duration--100",
        "100ms"
      ]
    },
    "c_tree_view__list_TransitionDuration_slide": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--slide",
      "value": "0s",
      "values": [
        "--pf-v6-c-tree-view__list--TransitionDuration--collapse--slide",
        "0s"
      ]
    },
    "c_tree_view__list_TransitionDuration_fade": {
      "name": "--pf-v6-c-tree-view__list--TransitionDuration--fade",
      "value": "100ms",
      "values": [
        "--pf-v6-c-tree-view__list--TransitionDuration--collapse--fade",
        "--pf-t--global--motion--duration--fade--short",
        "--pf-t--global--motion--duration--sm",
        "--pf-t--global--duration--100",
        "100ms"
      ]
    },
    "c_tree_view__list_TransitionTimingFunction": {
      "name": "--pf-v6-c-tree-view__list--TransitionTimingFunction",
      "value": "cubic-bezier(.4, 0, .2, 1)",
      "values": [
        "--pf-t--global--motion--timing-function--default",
        "--pf-t--global--timing-function--200",
        "cubic-bezier(.4, 0, .2, 1)"
      ]
    },
    "c_tree_view__list_Opacity": {
      "name": "--pf-v6-c-tree-view__list--Opacity",
      "value": "0"
    },
    "c_tree_view_m_expanded__list_Opacity": {
      "name": "--pf-v6-c-tree-view--m-expanded__list--Opacity",
      "value": "1"
    },
    "c_tree_view__list_TranslateY": {
      "name": "--pf-v6-c-tree-view__list--TranslateY",
      "value": "0"
    },
    "c_tree_view_m_expanded__list_TranslateY": {
      "name": "--pf-v6-c-tree-view--m-expanded__list--TranslateY",
      "value": "0"
    },
    "c_tree_view__list_item__list_item__node_toggle_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingBlockStart",
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__list_item__list_item__node_toggle_TranslateX": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--TranslateX",
      "value": "-100%"
    },
    "c_tree_view__node_toggle_Position": {
      "name": "--pf-v6-c-tree-view__node-toggle--Position",
      "value": "absolute"
    },
    "c_tree_view__node_toggle_Color_base": {
      "name": "--pf-v6-c-tree-view__node-toggle--Color--base",
      "value": "#707070",
      "values": [
        "--pf-t--global--icon--color--subtle",
        "--pf-t--global--icon--color--200",
        "--pf-t--color--gray--50",
        "#707070"
      ]
    },
    "c_tree_view__node_toggle_Color": {
      "name": "--pf-v6-c-tree-view__node-toggle--Color",
      "value": "#707070",
      "values": [
        "--pf-v6-c-tree-view__node-toggle--Color--base",
        "--pf-t--global--icon--color--subtle",
        "--pf-t--global--icon--color--200",
        "--pf-t--color--gray--50",
        "#707070"
      ]
    },
    "c_tree_view__node_toggle_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__node-toggle--BackgroundColor",
      "value": "transparent"
    },
    "c_tree_view__list_item_m_expanded__node_toggle_Color": {
      "name": "--pf-v6-c-tree-view__list-item--m-expanded__node-toggle--Color",
      "value": "#1f1f1f",
      "values": [
        "--pf-t--global--icon--color--regular",
        "--pf-t--global--icon--color--100",
        "--pf-t--color--gray--90",
        "#1f1f1f"
      ]
    },
    "c_tree_view__node_toggle_icon_MinWidth": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--MinWidth",
      "value": "0.875rem",
      "values": [
        "--pf-t--global--icon--size--font--body--default",
        "--pf-t--global--font--size--body--default",
        "--pf-t--global--font--size--sm",
        "--pf-t--global--font--size--200",
        "0.875rem"
      ]
    },
    "c_tree_view__node_toggle_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__node-toggle--PaddingBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_toggle_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view__node-toggle--PaddingInlineEnd",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view__node_toggle_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__node-toggle--PaddingBlockEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_toggle_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node-toggle--PaddingInlineStart",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view__node_toggle_MarginBlockStart": {
      "name": "--pf-v6-c-tree-view__node-toggle--MarginBlockStart",
      "value": "calc(0.5rem * -1)",
      "values": [
        "calc(--pf-v6-c-tree-view__node-toggle--PaddingBlockStart * -1)",
        "calc(--pf-t--global--spacer--sm * -1)",
        "calc(--pf-t--global--spacer--200 * -1)",
        "calc(0.5rem * -1)"
      ]
    },
    "c_tree_view__node_toggle_MarginBlockEnd": {
      "name": "--pf-v6-c-tree-view__node-toggle--MarginBlockEnd",
      "value": "calc(0.5rem * -1)",
      "values": [
        "calc(--pf-v6-c-tree-view__node-toggle--PaddingBlockStart * -1)",
        "calc(--pf-t--global--spacer--sm * -1)",
        "calc(--pf-t--global--spacer--200 * -1)",
        "calc(0.5rem * -1)"
      ]
    },
    "c_tree_view__node_toggle_icon_TransitionDuration": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--TransitionDuration",
      "value": "100ms",
      "values": [
        "--pf-t--global--motion--duration--icon--default",
        "--pf-t--global--motion--duration--sm",
        "--pf-t--global--duration--100",
        "100ms"
      ]
    },
    "c_tree_view__node_toggle_icon_TransitionTimingFunction": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--TransitionTimingFunction",
      "value": "cubic-bezier(.4, 0, .2, 1)",
      "values": [
        "--pf-t--global--motion--timing-function--default",
        "--pf-t--global--timing-function--200",
        "cubic-bezier(.4, 0, .2, 1)"
      ]
    },
    "c_tree_view__node_check_MarginInlineEnd": {
      "name": "--pf-v6-c-tree-view__node-check--MarginInlineEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_count_MarginInlineStart": {
      "name": "--pf-v6-c-tree-view__node-count--MarginInlineStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__search_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__search--PaddingBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__search_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view__search--PaddingInlineEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__search_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__search--PaddingBlockEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__search_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__search--PaddingInlineStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_icon_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view__node-icon--PaddingInlineEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_icon_Color": {
      "name": "--pf-v6-c-tree-view__node-icon--Color",
      "value": "#707070",
      "values": [
        "--pf-t--global--icon--color--subtle",
        "--pf-t--global--icon--color--200",
        "--pf-t--color--gray--50",
        "#707070"
      ]
    },
    "c_tree_view__node_toggle_icon_base_Rotate": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--base--Rotate",
      "value": "0"
    },
    "c_tree_view__node_toggle_icon_Rotate": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--Rotate",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view__node-toggle-icon--base--Rotate",
        "0"
      ]
    },
    "c_tree_view__list_item_m_expanded__node_toggle_icon_Rotate": {
      "name": "--pf-v6-c-tree-view__list-item--m-expanded__node-toggle-icon--Rotate",
      "value": "90deg"
    },
    "c_tree_view__node_text_max_lines": {
      "name": "--pf-v6-c-tree-view__node-text--max-lines",
      "value": "1"
    },
    "c_tree_view__node_title_FontWeight": {
      "name": "--pf-v6-c-tree-view__node-title--FontWeight",
      "value": "500",
      "values": [
        "--pf-t--global--font--weight--body--bold",
        "--pf-t--global--font--weight--200",
        "500"
      ]
    },
    "c_tree_view__action_MarginInlineEnd": {
      "name": "--pf-v6-c-tree-view__action--MarginInlineEnd",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view_m_guides_guide_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--guide--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1.5rem)",
      "values": [
        "--pf-v6-c-tree-view--m-guides--guide-left--base",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides__list-node--guide-width--base)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--lg)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--400)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1.5rem)"
      ]
    },
    "c_tree_view_m_guides_guide_color_base": {
      "name": "--pf-v6-c-tree-view--m-guides--guide-color--base",
      "value": "#c7c7c7",
      "values": [
        "--pf-t--global--border--color--default",
        "--pf-t--global--border--color--100",
        "--pf-t--color--gray--30",
        "#c7c7c7"
      ]
    },
    "c_tree_view_m_guides_guide_width_base": {
      "name": "--pf-v6-c-tree-view--m-guides--guide-width--base",
      "value": "1px",
      "values": [
        "--pf-t--global--border--width--divider--default",
        "--pf-t--global--border--width--100",
        "1px"
      ]
    },
    "c_tree_view_m_guides_guide_left_base": {
      "name": "--pf-v6-c-tree-view--m-guides--guide-left--base",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides__list-node--guide-width--base)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--lg)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--400)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1.5rem)"
      ]
    },
    "c_tree_view_m_guides_guide_left_base_offset": {
      "name": "--pf-v6-c-tree-view--m-guides--guide-left--base--offset",
      "value": "calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2)",
      "values": [
        "calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2)",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2)",
        "calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2)",
        "calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2)"
      ]
    },
    "c_tree_view_m_guides__list_node_guide_width_base": {
      "name": "--pf-v6-c-tree-view--m-guides__list-node--guide-width--base",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_guides__list_item_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--before--InsetBlockStart",
      "value": "0"
    },
    "c_tree_view_m_guides__list_item_before_Width": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--before--Width",
      "value": "1px",
      "values": [
        "--pf-v6-c-tree-view--m-guides--guide-width--base",
        "--pf-t--global--border--width--divider--default",
        "--pf-t--global--border--width--100",
        "1px"
      ]
    },
    "c_tree_view_m_guides__list_item_before_Height": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--before--Height",
      "value": "100%"
    },
    "c_tree_view_m_guides__list_item_before_BackgroundColor": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--before--BackgroundColor",
      "value": "#c7c7c7",
      "values": [
        "--pf-v6-c-tree-view--m-guides--guide-color--base",
        "--pf-t--global--border--color--default",
        "--pf-t--global--border--color--100",
        "--pf-t--color--gray--30",
        "#c7c7c7"
      ]
    },
    "c_tree_view_m_guides__list_item_last_child_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--last-child--before--InsetBlockStart",
      "value": "1.125rem",
      "values": [
        "--pf-v6-c-tree-view--m-guides__node--before--InsetBlockStart",
        "1.125rem"
      ]
    },
    "c_tree_view_m_guides__list_item_last_child_before_Height": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--last-child--before--Height",
      "value": "1.125rem",
      "values": [
        "--pf-v6-c-tree-view--m-guides__list-item--last-child--before--InsetBlockStart",
        "--pf-v6-c-tree-view--m-guides__node--before--InsetBlockStart",
        "1.125rem"
      ]
    },
    "c_tree_view_m_guides__list_item_ZIndex": {
      "name": "--pf-v6-c-tree-view--m-guides__list-item--ZIndex",
      "value": "100",
      "values": [
        "--pf-t--global--z-index--xs",
        "--pf-t--global--z-index--100",
        "100"
      ]
    },
    "c_tree_view_m_guides__node_before_Width": {
      "name": "--pf-v6-c-tree-view--m-guides__node--before--Width",
      "value": "1rem"
    },
    "c_tree_view_m_guides__node_before_Height": {
      "name": "--pf-v6-c-tree-view--m-guides__node--before--Height",
      "value": "1px",
      "values": [
        "--pf-v6-c-tree-view--m-guides--guide-width--base",
        "--pf-t--global--border--width--divider--default",
        "--pf-t--global--border--width--100",
        "1px"
      ]
    },
    "c_tree_view_m_guides__node_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-guides__node--before--InsetBlockStart",
      "value": "1.125rem"
    },
    "c_tree_view_m_guides__node_before_BackgroundColor": {
      "name": "--pf-v6-c-tree-view--m-guides__node--before--BackgroundColor",
      "value": "#c7c7c7",
      "values": [
        "--pf-v6-c-tree-view--m-guides--guide-color--base",
        "--pf-t--global--border--color--default",
        "--pf-t--global--border--color--100",
        "--pf-t--color--gray--30",
        "#c7c7c7"
      ]
    },
    "c_tree_view_m_compact_base_border_InsetInlineStart_offset": {
      "name": "--pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view_m_compact_base_border_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact__node_indent_base": {
      "name": "--pf-v6-c-tree-view--m-compact__node--indent--base",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view_m_compact__node_nested_indent_base": {
      "name": "--pf-v6-c-tree-view--m-compact__node--nested-indent--base",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact_border_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact__node_Color": {
      "name": "--pf-v6-c-tree-view--m-compact__node--Color",
      "value": "#151515",
      "values": [
        "--pf-t--global--text--color--regular",
        "--pf-t--global--text--color--100",
        "--pf-t--color--gray--95",
        "#151515"
      ]
    },
    "c_tree_view_m_compact__node_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingBlockStart",
      "value": "0"
    },
    "c_tree_view_m_compact__node_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingBlockEnd",
      "value": "0"
    },
    "c_tree_view_m_compact__node_nested_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view_m_compact__node_nested_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockEnd",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view_m_compact__list_item__list_item__node_toggle_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item__list-item__node-toggle--InsetBlockStart",
      "value": "calc(1.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart)",
        "calc(--pf-t--global--spacer--lg)",
        "calc(--pf-t--global--spacer--400)",
        "calc(1.5rem)"
      ]
    },
    "c_tree_view_m_compact__list_item_BorderBlockEndWidth": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--BorderBlockEndWidth",
      "value": "1px",
      "values": [
        "--pf-t--global--border--width--divider--default",
        "--pf-t--global--border--width--100",
        "1px"
      ]
    },
    "c_tree_view_m_compact__list_item_BorderBlockEndColor": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--BorderBlockEndColor",
      "value": "#c7c7c7",
      "values": [
        "--pf-t--global--border--color--default",
        "--pf-t--global--border--color--100",
        "--pf-t--color--gray--30",
        "#c7c7c7"
      ]
    },
    "c_tree_view_m_compact__list_item_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--before--InsetBlockStart",
      "value": "0"
    },
    "c_tree_view_m_compact__list_item_last_child_before_Height": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--last-child--before--Height",
      "value": "calc(1.5rem + 0.5rem + 0.25rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--before--InsetBlockStart",
        "calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem)",
        "calc(--pf-t--global--spacer--lg + --pf-t--global--spacer--sm + 0.25rem)",
        "calc(--pf-t--global--spacer--400 + --pf-t--global--spacer--200 + 0.25rem)",
        "calc(1.5rem + 0.5rem + 0.25rem)"
      ]
    },
    "c_tree_view_m_compact__list_item_nested_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--nested--before--InsetBlockStart",
      "value": "calc(0.5rem * -1)",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart * -1)",
        "calc(--pf-t--global--spacer--sm * -1)",
        "calc(--pf-t--global--spacer--200 * -1)",
        "calc(0.5rem * -1)"
      ]
    },
    "c_tree_view_m_compact__list_item_nested_last_child_before_Height": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--nested--last-child--before--Height",
      "value": "calc(calc(1.5rem + 0.5rem + 0.25rem) + 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--before--InsetBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart)",
        "calc(calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem) + --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--lg + --pf-t--global--spacer--sm + 0.25rem) + --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--400 + --pf-t--global--spacer--200 + 0.25rem) + 0.5rem)",
        "calc(calc(1.5rem + 0.5rem + 0.25rem) + 0.5rem)"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--indent--base",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view_m_compact__node_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--before--InsetBlockStart",
      "value": "calc(1.5rem + 0.5rem + 0.25rem)",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem)",
        "calc(--pf-t--global--spacer--lg + --pf-t--global--spacer--sm + 0.25rem)",
        "calc(--pf-t--global--spacer--400 + --pf-t--global--spacer--200 + 0.25rem)",
        "calc(1.5rem + 0.5rem + 0.25rem)"
      ]
    },
    "c_tree_view_m_compact__node_level_2_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--level-2--PaddingInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--indent--base",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view_m_compact__node_toggle_nested_MarginInlineEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-toggle--nested--MarginInlineEnd",
      "value": "calc(1rem * -.5)",
      "values": [
        "calc(--pf-v6-c-tree-view__node-toggle--PaddingInlineStart * -.5)",
        "calc(--pf-t--global--spacer--md * -.5)",
        "calc(--pf-t--global--spacer--300 * -.5)",
        "calc(1rem * -.5)"
      ]
    },
    "c_tree_view_m_compact__node_toggle_nested_MarginInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node-toggle--nested--MarginInlineStart",
      "value": "calc(1rem * -1.5)",
      "values": [
        "calc(--pf-v6-c-tree-view__node-toggle--PaddingInlineStart * -1.5)",
        "calc(--pf-t--global--spacer--md * -1.5)",
        "calc(--pf-t--global--spacer--300 * -1.5)",
        "calc(1rem * -1.5)"
      ]
    },
    "c_tree_view_m_compact__node_container_Display": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--Display",
      "value": "flex"
    },
    "c_tree_view_m_compact__node_container_PaddingBlockEnd_base": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd--base",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingInlineEnd",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd",
      "value": "1.5rem",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd--base",
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingInlineStart",
      "value": "0.25rem",
      "values": [
        "--pf-t--global--spacer--xs",
        "--pf-t--global--spacer--100",
        "0.25rem"
      ]
    },
    "c_tree_view_m_compact__node_container_BorderRadius": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--BorderRadius",
      "value": "6px",
      "values": [
        "--pf-t--global--border--radius--small",
        "--pf-t--global--border--radius--200",
        "6px"
      ]
    },
    "c_tree_view_m_compact__node_container_nested_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingBlockStart",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view_m_compact__node_container_nested_PaddingInlineEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingInlineEnd",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_nested_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingBlockEnd",
      "value": "1rem",
      "values": [
        "--pf-t--global--spacer--md",
        "--pf-t--global--spacer--300",
        "1rem"
      ]
    },
    "c_tree_view_m_compact__node_container_nested_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingInlineStart",
      "value": "1.5rem",
      "values": [
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    },
    "c_tree_view_m_compact__node_container_nested_BackgroundColor": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--BackgroundColor",
      "value": "#f2f2f2",
      "values": [
        "--pf-t--global--background--color--secondary--default",
        "--pf-t--global--background--color--200",
        "--pf-t--color--gray--10",
        "#f2f2f2"
      ]
    },
    "c_tree_view_m_compact__list_item_m_expanded__node_container_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--m-expanded__node-container--PaddingBlockEnd",
      "value": "0"
    },
    "c_tree_view_m_no_background__node_container_BackgroundColor": {
      "name": "--pf-v6-c-tree-view--m-no-background__node-container--BackgroundColor",
      "value": "transparent"
    },
    "c_tree_view_m_compact_m_no_background_base_border_InsetInlineStart_offset": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset",
      "value": "0.5rem",
      "values": [
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view_m_compact_m_no_background_base_border_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_indent_base": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_nested_indent_base": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base",
      "value": "3rem",
      "values": [
        "--pf-t--global--spacer--2xl",
        "--pf-t--global--spacer--600",
        "3rem"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_nested_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--nested--PaddingBlockStart",
      "value": "0"
    },
    "c_tree_view_m_compact_m_no_background__node_nested_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--nested--PaddingBlockEnd",
      "value": "0"
    },
    "c_tree_view_m_compact_m_no_background__node_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--before--InsetBlockStart",
      "value": "calc(1rem + 0.5rem + 0.25rem)",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem)",
        "calc(--pf-t--global--spacer--md + --pf-t--global--spacer--sm + 0.25rem)",
        "calc(--pf-t--global--spacer--300 + --pf-t--global--spacer--200 + 0.25rem)",
        "calc(1rem + 0.5rem + 0.25rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view_m_guides_guide_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--guide--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
        "--pf-v6-c-tree-view--m-compact__node--indent--base",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view_m_compact_border_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact__list_item_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--before--InsetBlockStart",
      "value": "calc(0.5rem * -1)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__list-item--nested--before--InsetBlockStart",
        "calc(--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart * -1)",
        "calc(--pf-t--global--spacer--sm * -1)",
        "calc(--pf-t--global--spacer--200 * -1)",
        "calc(0.5rem * -1)"
      ]
    },
    "c_tree_view_m_compact__list_item_last_child_before_Height": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--last-child--before--Height",
      "value": "calc(calc(1.5rem + 0.5rem + 0.25rem) + 0.5rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__list-item--nested--last-child--before--Height",
        "calc(--pf-v6-c-tree-view--m-compact__node--before--InsetBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart)",
        "calc(calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem) + --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--lg + --pf-t--global--spacer--sm + 0.25rem) + --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--400 + --pf-t--global--spacer--200 + 0.25rem) + 0.5rem)",
        "calc(calc(1.5rem + 0.5rem + 0.25rem) + 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact .pf-v6-c-tree-view__list-item:last-child": {
    "c_tree_view_m_compact__list_item_BorderBlockEndWidth": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--BorderBlockEndWidth",
      "value": "0"
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact": {
    "c_tree_view__node_Color": {
      "name": "--pf-v6-c-tree-view__node--Color",
      "value": "#151515",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--Color",
        "--pf-t--global--text--color--regular",
        "--pf-t--global--text--color--100",
        "--pf-t--color--gray--95",
        "#151515"
      ]
    },
    "c_tree_view__node_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockStart",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--PaddingBlockStart",
        "0"
      ]
    },
    "c_tree_view__node_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockEnd",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--PaddingBlockEnd",
        "0"
      ]
    },
    "c_tree_view__node_container_Display": {
      "name": "--pf-v6-c-tree-view__node-container--Display",
      "value": "flex",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node-container--Display",
        "flex"
      ]
    },
    "c_tree_view__node_hover_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__node--hover--BackgroundColor",
      "value": "transparent"
    },
    "c_tree_view__list_item__list_item__node_toggle_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetBlockStart",
      "value": "calc(1.5rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__list-item__list-item__node-toggle--InsetBlockStart",
        "calc(--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockStart)",
        "calc(--pf-t--global--spacer--lg)",
        "calc(--pf-t--global--spacer--400)",
        "calc(1.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact .pf-v6-c-tree-view__list-item.pf-m-expanded": {
    "c_tree_view_m_compact__node_container_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view--m-compact__list-item--m-expanded__node-container--PaddingBlockEnd",
        "0"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__node_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockStart",
      "value": "0.5rem",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart",
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockEnd",
      "value": "0.5rem",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockEnd",
        "--pf-t--global--spacer--sm",
        "--pf-t--global--spacer--200",
        "0.5rem"
      ]
    },
    "c_tree_view__node_toggle_Position": {
      "name": "--pf-v6-c-tree-view__node-toggle--Position",
      "value": "static"
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node--level-2--PaddingInlineStart",
        "--pf-v6-c-tree-view--m-compact__node--indent--base",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__list_item__list_item__node_toggle_TranslateX": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--TranslateX",
      "value": "0"
    },
    "c_tree_view_m_compact__list_item_BorderBlockEndWidth": {
      "name": "--pf-v6-c-tree-view--m-compact__list-item--BorderBlockEndWidth",
      "value": "0"
    },
    "c_tree_view_m_compact__node_container_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd",
      "value": "1.5rem",
      "values": [
        "--pf-v6-c-tree-view--m-compact__node-container--PaddingBlockEnd--base",
        "--pf-t--global--spacer--lg",
        "--pf-t--global--spacer--400",
        "1.5rem"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact.pf-m-no-background": {
    "c_tree_view_m_compact__node_before_InsetBlockStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--before--InsetBlockStart",
      "value": "calc(1rem + 0.5rem + 0.25rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact--m-no-background__node--before--InsetBlockStart",
        "calc(--pf-v6-c-tree-view--m-compact__node-container--nested--PaddingBlockStart + --pf-v6-c-tree-view--m-compact__node--nested--PaddingBlockStart + 0.25rem)",
        "calc(--pf-t--global--spacer--md + --pf-t--global--spacer--sm + 0.25rem)",
        "calc(--pf-t--global--spacer--300 + --pf-t--global--spacer--200 + 0.25rem)",
        "calc(1rem + 0.5rem + 0.25rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact.pf-m-no-background .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__node_PaddingBlockStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockStart",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view--m-compact--m-no-background__node--nested--PaddingBlockStart",
        "0"
      ]
    },
    "c_tree_view__node_PaddingBlockEnd": {
      "name": "--pf-v6-c-tree-view__node--PaddingBlockEnd",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view--m-compact--m-no-background__node--nested--PaddingBlockEnd",
        "0"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-compact.pf-m-no-background .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view_m_compact_border_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(3rem * 1 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 1 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 1 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 1 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 1 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 1 + calc(1rem * 2 + 0.875rem))"
      ]
    }
  },
  ".pf-v6-c-tree-view.pf-m-no-background": {
    "c_tree_view_m_compact__node_container_nested_BackgroundColor": {
      "name": "--pf-v6-c-tree-view--m-compact__node-container--nested--BackgroundColor",
      "value": "transparent",
      "values": [
        "--pf-v6-c-tree-view--m-no-background__node-container--BackgroundColor",
        "transparent"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__node_toggle_icon_Rotate": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--Rotate",
      "value": "0",
      "values": [
        "--pf-v6-c-tree-view__node-toggle-icon--base--Rotate",
        "0"
      ]
    },
    "c_tree_view__node_toggle_Color": {
      "name": "--pf-v6-c-tree-view__node-toggle--Color",
      "value": "#707070",
      "values": [
        "--pf-v6-c-tree-view__node-toggle--Color--base",
        "--pf-t--global--icon--color--subtle",
        "--pf-t--global--icon--color--200",
        "--pf-t--color--gray--50",
        "#707070"
      ]
    },
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 1 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 1 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 1 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 1 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 1 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 1 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 1 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 1 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 1 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item.pf-m-expanded": {
    "c_tree_view__node_toggle_Color": {
      "name": "--pf-v6-c-tree-view__node-toggle--Color",
      "value": "#1f1f1f",
      "values": [
        "--pf-v6-c-tree-view__list-item--m-expanded__node-toggle--Color",
        "--pf-t--global--icon--color--regular",
        "--pf-t--global--icon--color--100",
        "--pf-t--color--gray--90",
        "#1f1f1f"
      ]
    },
    "c_tree_view__node_toggle_icon_Rotate": {
      "name": "--pf-v6-c-tree-view__node-toggle-icon--Rotate",
      "value": "90deg",
      "values": [
        "--pf-v6-c-tree-view__list-item--m-expanded__node-toggle-icon--Rotate",
        "90deg"
      ]
    }
  },
  ".pf-v6-c-tree-view__node.pf-m-current": {
    "c_tree_view__node_Color": {
      "name": "--pf-v6-c-tree-view__node--Color",
      "value": "#151515",
      "values": [
        "--pf-v6-c-tree-view__node--m-current--Color",
        "--pf-t--global--text--color--regular",
        "--pf-t--global--text--color--100",
        "--pf-t--color--gray--95",
        "#151515"
      ]
    },
    "c_tree_view__node_BorderWidth": {
      "name": "--pf-v6-c-tree-view__node--BorderWidth",
      "value": "0px",
      "values": [
        "--pf-v6-c-tree-view__node--m-current--BorderWidth",
        "--pf-t--global--border--width--action--plain--clicked",
        "0px"
      ]
    }
  },
  ".pf-v6-c-tree-view__node-title.pf-m-truncate": {
    "c_tree_view__node_content_Overflow": {
      "name": "--pf-v6-c-tree-view__node-content--Overflow",
      "value": "hidden"
    }
  },
  ".pf-v6-c-tree-view.pf-m-truncate .pf-v6-c-tree-view__node-title": {
    "c_tree_view__node_content_Overflow": {
      "name": "--pf-v6-c-tree-view__node-content--Overflow",
      "value": "hidden"
    }
  },
  ".pf-v6-c-tree-view__content:hover": {
    "c_tree_view__node_BorderWidth": {
      "name": "--pf-v6-c-tree-view__node--BorderWidth",
      "value": "0px",
      "values": [
        "--pf-v6-c-tree-view__node--hover--BorderWidth",
        "--pf-t--global--border--width--action--plain--hover",
        "0px"
      ]
    }
  },
  ".pf-v6-c-tree-view__content:has(> .pf-v6-c-tree-view__node.pf-m-current)": {
    "c_tree_view__content_BackgroundColor": {
      "name": "--pf-v6-c-tree-view__content--BackgroundColor",
      "value": "#f2f2f2",
      "values": [
        "--pf-v6-c-tree-view__node--m-current--BackgroundColor",
        "--pf-t--global--background--color--primary--clicked",
        "--pf-t--global--background--color--200",
        "--pf-t--color--gray--10",
        "#f2f2f2"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 2 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 2 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 2 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 2 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 2 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 2 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 2 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 2 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 2 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 1 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 1 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 1 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 1 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 1 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 1 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 1 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 1 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 1 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 1 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 1 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 1 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 1 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 3 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 3 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 3 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 3 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 3 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 3 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 3 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 3 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 3 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 2 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 2 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 2 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 2 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 2 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 2 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 2 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 2 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 2 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 2 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 2 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 2 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 2 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 4 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 4 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 4 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 4 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 4 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 4 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 4 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 4 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 4 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 3 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 3 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 3 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 3 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 3 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 3 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 3 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 3 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 3 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 3 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 3 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 3 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 3 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 5 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 5 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 5 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 5 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 5 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 5 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 5 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 5 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 5 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 4 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 4 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 4 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 4 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 4 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 4 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 4 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 4 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 4 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 4 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 4 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 4 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 4 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 6 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 6 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 6 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 6 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 6 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 6 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 6 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 6 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 6 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 5 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 5 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 5 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 5 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 5 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 5 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 5 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 5 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 5 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 5 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 5 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 5 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 5 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 7 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 7 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 7 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 7 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 7 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 7 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 7 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 7 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 7 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 6 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 6 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 6 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 6 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 6 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 6 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 6 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 6 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 6 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 6 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 6 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 6 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 6 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 8 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 8 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 8 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 8 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 8 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 8 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 8 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 8 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 8 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 7 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 7 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 7 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 7 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 7 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 7 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 7 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 7 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 7 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 7 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 7 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 7 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 7 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 9 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 9 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 9 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 9 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 9 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 9 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 9 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 9 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 9 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 8 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 8 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 8 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 8 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 8 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 8 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 8 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 8 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 8 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 8 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 8 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 8 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 8 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  },
  ".pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item .pf-v6-c-tree-view__list-item": {
    "c_tree_view__list_item__list_item__node_toggle_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart",
      "value": "calc(1rem * 2 + 0.875rem)",
      "values": [
        "--pf-v6-c-tree-view__node--PaddingInlineStart",
        "--pf-v6-c-tree-view__node--indent--base",
        "calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth)",
        "calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--body--default)",
        "calc(1rem * 2 + --pf-t--global--font--size--sm)",
        "calc(1rem * 2 + --pf-t--global--font--size--200)",
        "calc(1rem * 2 + 0.875rem)"
      ]
    },
    "c_tree_view__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view__node--PaddingInlineStart",
      "value": "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 10 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--nested-indent--base * 10 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md) * 10 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300) * 10 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem) * 10 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem) * 10 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem) * 10 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem) * 10 + calc(1rem * 2 + 0.875rem))",
        "calc(calc(calc(1rem * 2 + 0.875rem) - 1rem) * 10 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_guides_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-guides--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-guides--guide-left--base--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - calc(--pf-v6-c-tree-view__list-item__list-item__node-toggle--InsetInlineStart + --pf-v6-c-tree-view__node-toggle-icon--MinWidth / 2))",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - calc(--pf-v6-c-tree-view__node--PaddingInlineStart + --pf-t--global--icon--size--font--body--default / 2))",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - calc(--pf-v6-c-tree-view__node--indent--base + --pf-t--global--font--size--body--default / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) + --pf-t--global--font--size--sm / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) + --pf-t--global--font--size--200 / 2))",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--sm) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + --pf-t--global--font--size--200) + 0.875rem / 2))",
        "calc(calc(1rem * 2 + 0.875rem) - calc(calc(1rem * 2 + 0.875rem) + 0.875rem / 2))"
      ]
    },
    "c_tree_view_m_compact__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact__node--PaddingInlineStart",
      "value": "calc(1.5rem * 9 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact__node--nested-indent--base * 9 + --pf-v6-c-tree-view--m-compact__node--indent--base)",
        "calc(--pf-t--global--spacer--lg * 9 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--400 * 9 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(1.5rem * 9 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(1.5rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(1.5rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(1.5rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(1.5rem * 9 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 1rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--md)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--300)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 1rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 1rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 1rem)"
      ]
    },
    "c_tree_view_m_compact_m_no_background__node_PaddingInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background__node--PaddingInlineStart",
      "value": "calc(3rem * 9 + calc(1rem * 2 + 0.875rem))",
      "values": [
        "calc(--pf-v6-c-tree-view--m-compact--m-no-background__node--nested-indent--base * 9 + --pf-v6-c-tree-view--m-compact--m-no-background__node--indent--base)",
        "calc(--pf-t--global--spacer--2xl * 9 + --pf-v6-c-tree-view__node--indent--base)",
        "calc(--pf-t--global--spacer--600 * 9 + calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth))",
        "calc(3rem * 9 + calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default))",
        "calc(3rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--body--default))",
        "calc(3rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--sm))",
        "calc(3rem * 9 + calc(1rem * 2 + --pf-t--global--font--size--200))",
        "calc(3rem * 9 + calc(1rem * 2 + 0.875rem))"
      ]
    },
    "c_tree_view_m_compact_m_no_background_border_nested_InsetInlineStart": {
      "name": "--pf-v6-c-tree-view--m-compact--m-no-background--border--nested--InsetInlineStart",
      "value": "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)",
      "values": [
        "calc(--pf-v6-c-tree-view__node--PaddingInlineStart - --pf-v6-c-tree-view--m-compact--m-no-background--base-border--InsetInlineStart--offset)",
        "calc(--pf-v6-c-tree-view__node--indent--base - --pf-t--global--spacer--sm)",
        "calc(calc(--pf-t--global--spacer--md * 2 + --pf-v6-c-tree-view__node-toggle-icon--MinWidth) - --pf-t--global--spacer--200)",
        "calc(calc(--pf-t--global--spacer--300 * 2 + --pf-t--global--icon--size--font--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--body--default) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--sm) - 0.5rem)",
        "calc(calc(1rem * 2 + --pf-t--global--font--size--200) - 0.5rem)",
        "calc(calc(1rem * 2 + 0.875rem) - 0.5rem)"
      ]
    }
  }
};
exports["default"] = exports.c_tree_view;
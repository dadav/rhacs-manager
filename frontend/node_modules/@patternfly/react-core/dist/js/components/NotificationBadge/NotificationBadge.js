"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBadge = exports.NotificationBadgeVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("../Button");
const attention_bell_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/attention-bell-icon'));
const bell_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/bell-icon'));
const button_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Button/button"));
const react_styles_1 = require("@patternfly/react-styles");
var NotificationBadgeVariant;
(function (NotificationBadgeVariant) {
    NotificationBadgeVariant["read"] = "read";
    NotificationBadgeVariant["unread"] = "unread";
    NotificationBadgeVariant["attention"] = "attention";
})(NotificationBadgeVariant || (exports.NotificationBadgeVariant = NotificationBadgeVariant = {}));
const NotificationBadge = (_a) => {
    var { children, variant = NotificationBadgeVariant.read, count = 0, attentionIcon = (0, jsx_runtime_1.jsx)(attention_bell_icon_1.default, {}), icon = (0, jsx_runtime_1.jsx)(bell_icon_1.default, {}), className, isExpanded = false, shouldNotify = false, onAnimationEnd } = _a, props = tslib_1.__rest(_a, ["children", "variant", "count", "attentionIcon", "icon", "className", "isExpanded", "shouldNotify", "onAnimationEnd"]);
    const [isAnimating, setIsAnimating] = (0, react_1.useState)(shouldNotify);
    const hasCount = count > 0;
    const hasChildren = children !== undefined;
    const isAttention = variant === NotificationBadgeVariant.attention;
    const notificationIcon = isAttention ? attentionIcon : icon;
    let notificationContent = null;
    if (hasCount) {
        notificationContent = count;
    }
    else if (hasChildren) {
        notificationContent = children;
    }
    const buttonClassName = isAnimating ? (0, react_styles_1.css)(className, button_1.default.modifiers.notify) : className;
    (0, react_1.useEffect)(() => {
        setIsAnimating(shouldNotify);
    }, [shouldNotify]);
    const handleAnimationEnd = (event) => {
        onAnimationEnd === null || onAnimationEnd === void 0 ? void 0 : onAnimationEnd(event);
        setIsAnimating(false);
    };
    return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.stateful, className: buttonClassName, "aria-expanded": isExpanded, state: variant, isClicked: isExpanded, icon: notificationIcon, onAnimationEnd: handleAnimationEnd }, props, { children: notificationContent })));
};
exports.NotificationBadge = NotificationBadge;
exports.NotificationBadge.displayName = 'NotificationBadge';
//# sourceMappingURL=NotificationBadge.js.map
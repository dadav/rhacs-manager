"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.TimestampTooltipVariant = exports.TimestampFormat = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const timestamp_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Timestamp/timestamp"));
const react_styles_1 = require("@patternfly/react-styles");
const Tooltip_1 = require("../Tooltip");
const datetimeUtils_1 = require("../../helpers/datetimeUtils");
var TimestampFormat;
(function (TimestampFormat) {
    TimestampFormat["full"] = "full";
    TimestampFormat["long"] = "long";
    TimestampFormat["medium"] = "medium";
    TimestampFormat["short"] = "short";
})(TimestampFormat || (exports.TimestampFormat = TimestampFormat = {}));
var TimestampTooltipVariant;
(function (TimestampTooltipVariant) {
    TimestampTooltipVariant["default"] = "default";
    TimestampTooltipVariant["custom"] = "custom";
})(TimestampTooltipVariant || (exports.TimestampTooltipVariant = TimestampTooltipVariant = {}));
const Timestamp = (_a) => {
    var { children, className, customFormat, date: dateProp, dateFormat, displaySuffix = '', is12Hour, locale, shouldDisplayUTC, timeFormat, tooltip } = _a, props = tslib_1.__rest(_a, ["children", "className", "customFormat", "date", "dateFormat", "displaySuffix", "is12Hour", "locale", "shouldDisplayUTC", "timeFormat", "tooltip"]);
    const [date, setDate] = (0, react_1.useState)(() => {
        const initDate = new Date(dateProp);
        if ((0, datetimeUtils_1.isValidDate)(initDate)) {
            return initDate;
        }
        return new Date();
    });
    (0, react_1.useEffect)(() => {
        const dateFromProp = new Date(dateProp);
        if ((0, datetimeUtils_1.isValidDate)(dateFromProp) && dateFromProp.toString() !== new Date(date).toString()) {
            setDate(dateFromProp);
        }
        else if (!dateProp) {
            setDate(new Date());
        }
    }, [dateProp]);
    const hasTimeFormat = timeFormat && !customFormat;
    const formatOptions = Object.assign(Object.assign(Object.assign({}, (dateFormat && !customFormat && { dateStyle: dateFormat })), (customFormat && Object.assign({}, customFormat))), (is12Hour !== undefined && { hour12: is12Hour }));
    const dateAsLocaleString = new Date(date).toLocaleString(locale, Object.assign(Object.assign({}, formatOptions), (hasTimeFormat && { timeStyle: timeFormat })));
    const utcTimeFormat = timeFormat !== 'short' ? 'medium' : 'short';
    const convertToUTCString = (date) => new Date(date).toUTCString().slice(0, -3);
    const utcDateString = new Date(convertToUTCString(date)).toLocaleString(locale, Object.assign(Object.assign({}, formatOptions), (hasTimeFormat && { timeStyle: utcTimeFormat })));
    const defaultUTCSuffix = timeFormat === 'full' ? 'Coordinated Universal Time' : 'UTC';
    const createUTCContent = (customSuffix) => `${utcDateString} ${customSuffix ? customSuffix : defaultUTCSuffix}`;
    const defaultDisplay = shouldDisplayUTC
        ? createUTCContent(displaySuffix)
        : `${dateAsLocaleString}${displaySuffix ? ' ' + displaySuffix : ''}`;
    const { dateTime } = props, propsWithoutDateTime = tslib_1.__rest(props, ["dateTime"]);
    const timestamp = ((0, jsx_runtime_1.jsx)("span", Object.assign({ className: (0, react_styles_1.css)(timestamp_1.default.timestamp, tooltip && timestamp_1.default.modifiers.helpText, className) }, (tooltip && { tabIndex: 0 }), propsWithoutDateTime, { children: (0, jsx_runtime_1.jsx)("time", { className: `${timestamp_1.default.timestamp}__text`, dateTime: dateTime || new Date(date).toISOString(), children: !children ? defaultDisplay : children }) })));
    return tooltip ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, Object.assign({ content: tooltip.variant === TimestampTooltipVariant.default ? createUTCContent(tooltip.suffix) : tooltip.content }, tooltip.tooltipProps, { children: timestamp }))) : (timestamp);
};
exports.Timestamp = Timestamp;
exports.Timestamp.displayName = 'Timestamp';
//# sourceMappingURL=Timestamp.js.map
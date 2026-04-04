
const generateSegmentId = (start, end) => {
  const round = (val) => Number(val).toFixed(5);
  return `${round(start.lat)},${round(start.lng)}-${round(end.lat)},${round(end.lng)}`;
};

module.exports = generateSegmentId;

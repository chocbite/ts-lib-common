/**Rounds a number to at most the requested number of decimal places without using a regular expression.
 * * @param value - The number to round.
 * @param decimal_count - The maximum number of decimal places.
 * @returns The rounded number as a string.*/
export function number_limit_decimals(
  value: number,
  decimal_count: number,
): string {
  const result = value.toFixed(decimal_count);
  const decimal_index = result.indexOf(".");
  if (decimal_index === -1) return result;

  let end = result.length;
  while (result[end - 1] === "0") end--;
  if (end === decimal_index + 1) end--;
  return result.slice(0, end);
}

import { TableRow, TableCell } from "@/components/ui/table";

interface TableEmptyRowProps {
  title: string;
  colSpan: number;
  subtitle?: string;
}

export default function TableEmptyRow({ title, colSpan, subtitle }: TableEmptyRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 items-center">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <p className="mb-2">{title}</p>
          {subtitle && (
            <p className="text-sm text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

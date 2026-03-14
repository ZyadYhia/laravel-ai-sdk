import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormContext } from '@inertiajs/react';
import classNames from 'classnames';
import { Paperclip, Send } from 'lucide-react';

type InputIconsPropsT = {
    inputValue: string;
    isTyping: boolean;
};

const InputIcons = (props: InputIconsPropsT) => {
    const { inputValue, isTyping } = props;
    // Get form context from parent <Form>
    const form = useFormContext();
    // Fallback for direct use (should always be inside <Form>)
    if (!form) return null;
    const { processing, setData, data } = form;
    return (
        <div className="absolute right-0 flex items-center gap-2">
            <Button
                type="submit"
                size="icon"
                disabled={
                    (!inputValue.trim() && !data?.image) ||
                    isTyping ||
                    processing
                }
                className={classNames(
                    'absolute right-1.5 h-9 w-9 rounded-full transition-all',
                    inputValue.trim() || data?.image
                        ? 'scale-100 opacity-100'
                        : 'scale-95 opacity-50',
                    (!inputValue.trim() && !data?.image) || isTyping
                        ? 'cursor-not-allowed'
                        : 'cursor-pointer',
                )}
            >
                <Send className="ml-0.5 h-4 w-4" />
            </Button>

            <Button
                type="button"
                size="icon"
                className="absolute right-12 h-9 w-9 cursor-pointer rounded-full transition-all"
                tabIndex={-1}
            >
                <label
                    htmlFor="file-upload"
                    className="m-0 flex cursor-pointer items-center"
                >
                    <Paperclip className="ml-0.5 h-4 w-4" />
                    <Input
                        id="file-upload"
                        type="file"
                        name="image"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            setData('image', file || null);
                        }}
                    />
                </label>
            </Button>
        </div>
    );
};
export default InputIcons;

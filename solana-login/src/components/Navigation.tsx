import WalletButton from "./WalletButton";

export default function Navigation() {
  return (
    <div className="flex items-center px-12 py-2 bg-neutral-100">
      <a href="/public" className="px-3 text-[blue] hover:underline">Public</a>
      <a href="/private" className="px-3 text-[blue] hover:underline">Private</a>
      <div className="flex grow justify-end">
        <WalletButton />
      </div>
    </div>
  )
}
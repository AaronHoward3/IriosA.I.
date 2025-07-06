import React, { useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GradientTextarea } from "@/components/ui/gradient-textarea";
import { GradientInput } from "@/components/ui/gradient-input";
import { FormData, Tone, ProductLink } from "../EmailGenerator";

interface Step3CustomizationProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const toneOptions: { value: Tone; label: string }[] = [
  { value: "bold", label: "Bold" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "fun", label: "Fun" },
];

export const Step3Customization: React.FC<Step3CustomizationProps> = ({
  formData,
  updateFormData,
  onNext,
  onPrev,
}) => {
  const [useCustomHero, setUseCustomHero] = useState(
    formData.useCustomHero ?? true
  );
  const [userContext, setUserContext] = useState(formData.userContext ?? "");
  const [tone, setTone] = useState(formData.tone ?? "bold");
  const [products, setProducts] = useState<ProductLink[]>(
    Array.isArray(formData.products) ? formData.products : []
  );
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUrl, setNewProductUrl] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");

  const handleAddProduct = () => {
    if (newProductName.trim() && newProductUrl.trim()) {
      const newProduct: ProductLink = {
        name: newProductName.trim(),
        url: newProductUrl.trim(),
        image: newProductImage.trim() || undefined,
        description: newProductDescription.trim() || "",
      };

      const exists = products.some(
        (p) => p.name === newProduct.name || p.url === newProduct.url
      );

      if (!exists) {
        const updatedProducts = [...products, newProduct];
        setProducts(updatedProducts);
        setNewProductName("");
        setNewProductUrl("");
        setNewProductImage("");
        setNewProductDescription("");
        setShowProductForm(false);
      }
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
  };

  const handleContinue = () => {
    console.log("Step 3 confirmed values:", {
      useCustomHero,
      userContext,
      tone,
      products,
    });
    updateFormData({
      useCustomHero,
      userContext,
      tone,
      products,
    });
    onNext();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Customize your email
        </h1>
        <p className="text-lg text-muted-foreground">
          Personalize your tone, hero image, and product recommendations.
        </p>
      </div>

      {/* Tone */}
      <div className="space-y-4">
        <label className="text-lg font-medium text-foreground">Tone</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {toneOptions.map((option) => (
            <GradientButton
              key={option.value}
              variant={tone === option.value ? "solid" : "white-outline"}
              onClick={() => setTone(option.value)}
            >
              {option.label}
            </GradientButton>
          ))}
        </div>
      </div>

      {/* Hero toggle */}
      <div className="space-y-4">
        <label className="text-lg font-medium text-foreground">
          Use Custom Hero Image?
        </label>
        <div className="flex space-x-4">
          <GradientButton
            variant={useCustomHero ? "solid" : "white-outline"}
            onClick={() => setUseCustomHero(true)}
            className="flex-1"
          >
            Yes
          </GradientButton>
          <GradientButton
            variant={!useCustomHero ? "solid" : "white-outline"}
            onClick={() => setUseCustomHero(false)}
            className="flex-1"
          >
            No
          </GradientButton>
        </div>
      </div>

      {/* User context */}
      <div className="space-y-4">
        <label className="text-lg font-medium text-foreground">
          User Context
        </label>
        <GradientTextarea
          placeholder="Describe your audience, goals, or requirements..."
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          rows={4}
        />
      </div>

      {/* Products */}
      <div className="space-y-4">
        <label className="text-lg font-medium text-foreground">Products</label>
        <div>
          {!showProductForm && (
            <GradientButton
              variant="white-outline"
              onClick={() => setShowProductForm(true)}
            >
              Add Product
            </GradientButton>
          )}
          {showProductForm && (
            <div className="space-y-3 p-4 border border-border rounded-lg">
              <GradientInput
                placeholder="Product name..."
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <GradientInput
                placeholder="Product URL (https://...)"
                value={newProductUrl}
                onChange={(e) => setNewProductUrl(e.target.value)}
              />
              <GradientInput
                placeholder="Product image URL (optional)"
                value={newProductImage}
                onChange={(e) => setNewProductImage(e.target.value)}
              />
              <GradientInput
                placeholder="Product description (optional)"
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
              />
              <div className="flex space-x-2">
                <GradientButton
                  variant="white-outline"
                  onClick={() => {
                    setShowProductForm(false);
                    setNewProductName("");
                    setNewProductUrl("");
                    setNewProductImage("");
                    setNewProductDescription("");
                  }}
                >
                  Cancel
                </GradientButton>
                <GradientButton
                  variant="solid"
                  onClick={handleAddProduct}
                  disabled={!newProductName.trim() || !newProductUrl.trim()}
                >
                  Add Product
                </GradientButton>
              </div>
            </div>
          )}
        </div>
        {products.length > 0 && (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {product.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.url}
                  </div>
                  {product.image && (
                    <div className="text-xs text-muted-foreground">
                      Image: {product.image}
                    </div>
                  )}
                  {product.description && (
                    <div className="text-xs text-muted-foreground">
                      Description: {product.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveProduct(index)}
                  className="text-muted-foreground hover:text-foreground ml-4"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-8">
        <GradientButton variant="white-outline" onClick={onPrev}>
          Back
        </GradientButton>
        <GradientButton variant="solid" onClick={handleContinue}>
          Next
        </GradientButton>
      </div>
    </div>
  );
};
